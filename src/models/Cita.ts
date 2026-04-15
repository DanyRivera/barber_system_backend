import mongoose, { Document, Schema } from "mongoose";

export interface ICita extends Document {
    nombre: string,
    telefono: string,
    fecha: string,
    hora: string
    costo?: number,
    user_id: Schema.Types.ObjectId,
    estado: string
}


const citaSchema = new Schema({
    nombre: {
        type: String,
        require: true,
        trim: true
    },
    telefono: {
        type: String,
        require: true,
        trim: true,
    },
    fecha: {
        type: String,
        require: true,
        trim: true
    },
    hora: {
        type: String,
        require: true,
        trim: true
    },
    costo: {
        type: Number,
        require: false
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'confirmada', 'completada', 'cancelada'],
        default: 'pendiente'
    }
})

const Cita = mongoose.model<ICita>('Cita', citaSchema);
export default Cita;

