import dns from "node:dns";
dns.setServers(["1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
    try {
        const {connection} = await mongoose.connect(process.env.MONGO_URL, {
            autoIndex: true
        });
        
        const url = `${connection.host}:${connection.port}`;
        console.log(colors.cyan.bold(`Mongo DB conectado en: ${url}`));
        
    } catch (error) {
        console.log(colors.bgRed(error.message));
        process.exit(1);
    }
}

export default connectDB;