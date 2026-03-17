import express from "express";

export const app = express();
console.log(`Worker ${process.pid} started`);

    app.get("/",(req,res)=>{
        res.send("Hello word");
    });

    app.get("/api/:n",function(req,res){
        let n = parseInt(req.params.n);
        let count = 0;

        if(n>50)n = 50;

        for(let i = 0 ; i<=n;i++){
            count += i;
        }

        res.send(`Final count is ${count} ${process.pid}`);
    })

    app.listen(port,()=>{
        console.log(`Server listening on port ${port} `);
    });

