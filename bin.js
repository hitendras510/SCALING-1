import cluster from "cluster";
import os from "os";
import app from "./index.js";

const totalCpu = os.cpus().length;

const port = 3000;

if(cluster.isPrimary){
    console.log(`number of cpu is ${totalCpu}`);
    console.log(`Primary ${process.pid} is runing`);

    //fork workers 
    for(let i=0;i<totalCpu;i++){
        cluster.fork();
    }
    cluster.on("exit",(worker,code,signal)=>{
        console.log(`worker ${worker.process.pid} died`);
        console.log(`Let's fork another worker!`);
        cluster.fork();
    });
}else{
     app.listen(port,()=>{
            console.log(`Server listening on port ${port} `);
        });
}