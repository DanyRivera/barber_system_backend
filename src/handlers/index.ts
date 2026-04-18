import { Request, Response } from "express"
import mongoose, { Schema } from "mongoose";

import User from "../models/User";
import Cita from "../models/Cita";
import { hashPassword, checkPassword } from "../utils/auth";
import { generateJWT } from "../utils/jwt";

export const createAccount = async (req: Request, res: Response) => {
    const { nombre, apellido, email, password } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) {
        const error = new Error('El usuario ya existe.');
        return res.status(409).json({ error: error.message });
    }

    const user = new User(req.body);
    user.password = await hashPassword(password);

    await user.save();

    res.status(200).send('Usuario Creado Correctamente');
}

export const login = async (req: Request, res: Response) => {

    const { email, password } = req.body;

    const userExist = await User.findOne({ email });
    if (!userExist) {
        const error = new Error('El usuario no existe.')
        return res.status(404).send(error.message);
    }

    //Comparar Password
    const passwordOk = await checkPassword(password, userExist.password.toString());
    if (!passwordOk) {
        const error = new Error('El password es incorrecto.')
        return res.status(401).send(error.message);
    }

    const token = generateJWT({ id: userExist._id })

    res.send(token);
}

export const getUser = async (req: Request, res: Response) => {
    res.json(req.user)
}

export const updateProfile = async (req: Request, res: Response) => {

    const { _id, nombre, apellido, email } = req.body;

    if (!_id) {
        const error = new Error('El id es requerido');
        return res.status(400).json({ error: error.message })
    }

    try {

        const user = await User.findByIdAndUpdate(
            _id,
            { nombre, apellido, email },
            { new: true, runValidators: true }
        ).select('-password')

        if (!user) {
            const error = new Error('Usuario no encontrado');
            return res.status(400).json({ error: error.message })
        }

        res.json({
            msg: "Usuario Actualizado Correctamente",
            user
        })

    } catch (error) {
        res.status(500).json({ error: 'Hubo un problema intentalo de nuevo' });
    }

}

export const createAppointment = async (req: Request, res: Response) => {

    try {
        const { fecha_hora, nombre, telefono, costo, user_id } = req.body;

        //Separar la hora y fecha del offSet que se le pasa desde el front (-06:00)
        const [fecha, horaConOffset] = fecha_hora.split('T');
        const [hora,] = horaConOffset.split('-')

        //Vaalidar que el user_id sea válido
        const userExist = await User.findById(user_id);
        if (!userExist) {
            const error = new Error("El usuario no existe");
            return res.status(404).json({ error: error.message });
        }

        //Validar que no exista una cita con las misma hora y cita
        const citaExist = await Cita.findOne({ fecha, hora });
        if (citaExist) {
            const error = new Error("Ya hay una cita ese día y hora");
            return res.status(409).json({ error: error.message });
        }

        //Validar Duplicado por cliente
        const clienteDuplicado = await Cita.findOne({ telefono, fecha });
        if (clienteDuplicado) {
            const error = new Error("Ese cliente ya tienen una cita ese día");
            return res.status(409).json({ error: error.message });
        }

        const cita = new Cita({
            nombre,
            telefono,
            fecha,
            hora,
            costo,
            user_id
        });

        await cita.save();

        res.status(201).send('Cita Agendada Correctamente');
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error inesperado, intentalo nuevamente' });
    }

}

export const updateAppointment = async (req: Request, res: Response) => {

    try {
        const { id } = req.params;
        const objectId = new mongoose.Types.ObjectId(id as string);

        const { fecha_hora, nombre, telefono, costo } = req.body;

        //Separar la hora y fecha del offSet que se le pasa desde el front (-06:00)
        const [fecha, horaConOffset] = fecha_hora.split('T');
        const [hora,] = horaConOffset.split('-')

        // Verificar que la cita existe
        const cita = await Cita.findById(id);
        if (!cita) {
            const error = new Error("La cita no existe");
            return res.status(404).json({ error: error.message });
        }

        //Validar que no exista una cita con las misma hora y cita
        const citaExist = await Cita.findOne({ fecha, hora, _id: { $ne: objectId } });
        if (citaExist) {
            const error = new Error("Ya hay una cita ese día y hora");
            return res.status(409).json({ error: error.message });
        }

        //Validar Duplicado por cliente
        const clienteDuplicado = await Cita.findOne({ telefono, fecha, _id: { $ne: objectId } });
        if (clienteDuplicado) {
            const error = new Error("Ese cliente ya tienen una cita ese día");
            return res.status(409).json({ error: error.message });
        }

        cita.nombre = nombre;
        cita.telefono = telefono;
        cita.fecha = fecha;
        cita.hora = hora;
        cita.costo = costo;
        await cita.save();

        res.status(201).send('Cita Actualizada Correctamente');

    } catch (error) {
        console.log(error);
        res.status(500).send({ error: 'Error inesperado, intentalo nuevamente' });
    }

}

export const deleteAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const cita = await Cita.findById(id);

        if (!cita) {
            const error = new Error("La cita no existe");
            return res.status(404).json({ error: error.message });
        }

        await cita.deleteOne();
        res.status(200).send('Cita eliminada correctamente');

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error inesperado, intentalo nuevamente' });
    }
}

export const getAppointments = async (req: Request, res: Response) => {
    try {
        const citas = await Cita.find({ user_id: req.user!._id as unknown as Schema.Types.ObjectId });
        res.status(200).json(citas);
    } catch (error) {
        res.status(500).json({ error: 'Error inesperado, intentalo nuevamente' });
    }
}

export const changeStatus = async (req: Request, res: Response) => {
    try {

        const { estado } = req.body;
        const { id } = req.params

        //Validar que no exista una cita con las misma hora y cita
        const citaExist = await Cita.findById(id);
        if (!citaExist) {
            const error = new Error("Esa cita no existe");
            return res.status(404).json({ error: error.message });
        }

        const statusValidos = ['pendiente', 'confirmada', 'completada', 'cancelada'];
        if (!statusValidos.includes(estado)) {
            const error = new Error("Status no válido");
            return res.status(400).json({ error: error.message });
        }


        citaExist.estado = estado;
        await citaExist.save();
        res.status(200).send('Estado de la cita cambiado correctamente');


    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error inesperado, intentalo nuevamente' });
    }
}