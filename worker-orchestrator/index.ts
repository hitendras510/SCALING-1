import express from "express";
import {
  AutoScalingClient,
  SetDesiredCapacityCommand,
  DescribeAutoScalingInstancesCommand,
  TerminateInstanceInAutoScalingGroupCommand,
} from "@aws-sdk/client-auto-scaling";
import {
  EC2Client,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";

const app = express();
app.use(express.json());


const REGION = "us-east-1";

const asgClient = new AutoScalingClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_ACCESSKEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECCRET!,
  },
});

const ec2Client = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_ACCESSKEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECCRET!,
  },
});


type Machine = {
  instanceId: string;
  ip: string;
  isUsed: boolean;
  assignedProject?: string;
};

let ALL_MACHINES: Machine[] = [];

const BUFFER = 2;
let lastScaleTime = 0;
const SCALE_COOLDOWN = 30000;


async function refreshInstances() {
  try {
    const asgData = await asgClient.send(
      new DescribeAutoScalingInstancesCommand({})
    );

    const instanceIds =
      asgData.AutoScalingInstances?.map((i) => i.InstanceId!) || [];

    if (instanceIds.length === 0) {
      ALL_MACHINES = [];
      return;
    }

    const ec2Data = await ec2Client.send(
      new DescribeInstancesCommand({
        InstanceIds: instanceIds,
      })
    );

    const machines: Machine[] = [];

    for (const reservation of ec2Data.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        if (!instance.InstanceId || !instance.PublicIpAddress) continue;

        machines.push({
          instanceId: instance.InstanceId,
          ip: instance.PublicIpAddress,
          isUsed:
            ALL_MACHINES.find((m) => m.instanceId === instance.InstanceId)
              ?.isUsed || false,
        });
      }
    }

    ALL_MACHINES = machines;

    console.log("Machines:", ALL_MACHINES);
  } catch (err) {
    console.error("Refresh error:", err);
  }
}


async function scaling() {
  const now = Date.now();

  if (now - lastScaleTime < SCALE_COOLDOWN) return;

  const total = ALL_MACHINES.length;
  const idle = ALL_MACHINES.filter((m) => !m.isUsed).length;

  const scaleUpBy = Math.max(0, BUFFER - idle);

  if (scaleUpBy === 0) return;

  const newDesired = total + scaleUpBy;

  console.log(`Scaling: ${total} → ${newDesired}`);

  try {
    await asgClient.send(
      new SetDesiredCapacityCommand({
        AutoScalingGroupName: "vscode-asg",
        DesiredCapacity: newDesired,
      })
    );

    lastScaleTime = now;
  } catch (err) {
    console.error("Scaling error:", err);
  }
}


app.get("/:projectId", async (req, res) => {
  const projectId = req.params.projectId;

  const idleMachine = ALL_MACHINES.find((m) => !m.isUsed);

  if (!idleMachine) {
    await scaling();

    return res.status(503).json({
      status: "pending",
      message: "No machine available, scaling in progress",
    });
  }

  // ✅ mark as used
  idleMachine.isUsed = true;
  idleMachine.assignedProject = projectId;

  res.json({
    ip: idleMachine.ip,
    instanceId: idleMachine.instanceId,
  });
});


app.post("/destroy", async (req, res) => {
  const { instanceId } = req.body;

  if (!instanceId) {
    return res.status(400).json({ error: "instanceId required" });
  }

  try {
    await asgClient.send(
      new TerminateInstanceInAutoScalingGroupCommand({
        InstanceId: instanceId,
        ShouldDecrementDesiredCapacity: true,
      })
    );

    ALL_MACHINES = ALL_MACHINES.filter(
      (m) => m.instanceId !== instanceId
    );

    res.json({ status: "terminated" });
  } catch (err) {
    console.error("Terminate error:", err);
    res.status(500).json({ error: "failed to terminate" });
  }
});


setInterval(refreshInstances, 10000);


refreshInstances();


app.listen(9092, () => {
  console.log("Server running on port 9092");
});