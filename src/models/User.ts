import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    nombre: String,
    apellido: String,
    email: String,
    password: String,
}

const userSchema = new Schema({
    nombre: {
        type: String,
        require: true,
        trim: true,
    },
    apellido: {
        type: String,
        require: true,
        trim: true,
    },
    email: {
        type: String,
        require: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        require: true,
        trim: true
    }
})

const User = mongoose.model<IUser>("User", userSchema);
export default User;