import mongoose, { Schema } from "mongoose";

export interface ICita {
    nombre: string,
    telefono: string,
    fecha: Date,
    hora: string
    costo?: number,
    user_id: Schema.Types.ObjectId
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
        type: Date,
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
    }
})

const Cita = mongoose.model<ICita>('Cita', citaSchema);
export default Cita;

