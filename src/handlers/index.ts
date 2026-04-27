import { Request, Response } from "express"
import mongoose, { Schema } from "mongoose";
import { generateText, tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from 'zod'

import User from "../models/User";
import Cita from "../models/Cita";
import { hashPassword, checkPassword } from "../utils/auth";
import { generateJWT } from "../utils/jwt";

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
})

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

export const answerIA = async (req: Request, res: Response) => {

    try {
        const { messages } = req.body
        const userId = req.user!._id as unknown as Schema.Types.ObjectId

        const hoyISO = new Date().toLocaleString('sv-SE', {
            timeZone: 'America/Mexico_City'
        }).split(' ')[0] // YYYY-MM-DD correcto en México

        const hoyFormateado = new Date().toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) // "domingo, 27 de abril de 2026"

        const citas = await Cita.find({
            user_id: userId,
            fecha: { $gte: hoyISO }
        })
            .sort({ fecha: 1, hora: 1 })
            .limit(20)
            .lean()

        const systemPrompt = `
                                Eres un asistente inteligente para una barbería. Tienes acceso completo al sistema de citas.

                                FECHA DE HOY: ${hoyFormateado} (${hoyISO})
                                USA SIEMPRE esta fecha como referencia para calcular "mañana", "siguiente lunes", "próximo jueves", etc.

                                IMPORTANTE: Ya tienes acceso completo a las citas. Úsalas para responder consultas.
                                NUNCA digas que no tienes acceso a la información.

                                === CITAS DEL SISTEMA ===
                                ${JSON.stringify(citas)}
                                =========================

                                REGLAS ESTRICTAS:
                                - Si el usuario quiere CREAR una cita → usa tool "crearCita"
                                - Si el usuario quiere EDITAR una cita → usa tool "editarCita"
                                - Si el usuario quiere CAMBIAR ESTADO → usa tool "cambiarEstado"
                                - Si el usuario quiere ELIMINAR una cita → usa tool "eliminarCita"
                                - NUNCA confirmes una acción sin haberla ejecutado con la tool correspondiente
                                - SIEMPRE después de ejecutar cualquier tool, responde con un mensaje en texto confirmando lo que hiciste. NUNCA dejes la respuesta vacía.
                                - NUNCA respondas con JSON crudo, siempre en lenguaje natural

                                REGLAS PARA CREAR CITAS:
                                - NECESITAS obligatoriamente: nombre, teléfono, fecha y hora
                                - Si falta alguno PREGUNTA antes de ejecutar
                                - NO ejecutes crearCita hasta tener los 4 datos
                                - El costo es opcional
                                - Fechas: YYYY-MM-DD | Horas: HH:MM

                                Responde siempre en español.
                            `

        const mensajesLimpios = messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({ role: m.role, content: m.content }))

        const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            system: systemPrompt,
            messages: mensajesLimpios,
            maxSteps: 5,
            tools: {

                crearCita: tool({
                    description: 'Crea una nueva cita en el sistema. Después de ejecutarla SIEMPRE confirma en texto al usuario.',
                    parameters: z.object({
                        nombre: z.string().describe('Nombre del cliente'),
                        telefono: z.string().describe('Teléfono del cliente'),
                        fecha: z.string().describe('Fecha en formato YYYY-MM-DD'),
                        hora: z.string().describe('Hora en formato HH:MM'),
                        costo: z.number().optional().describe('Costo de la cita'),
                    }),
                    execute: async ({ nombre, telefono, fecha, hora, costo }) => {
                        const costoFinal = costo ?? 0

                        const horaDuplicada = await Cita.findOne({ fecha, hora, user_id: userId })
                        if (horaDuplicada) return { ok: false, error: 'Ya hay una cita ese día y hora' }

                        const clienteDuplicado = await Cita.findOne({ telefono, fecha, user_id: userId })
                        if (clienteDuplicado) return { ok: false, error: 'Ese cliente ya tiene una cita ese día' }

                        const cita = new Cita({ nombre, telefono, fecha, hora, costo: costoFinal, user_id: userId })
                        await cita.save()
                        return { ok: true, mensaje: `Cita creada para ${nombre} el ${fecha} a las ${hora}. Responde confirmando esto al usuario en lenguaje natural.` }
                    }
                }),

                editarCita: tool({
                    description: 'Edita una cita existente. Después de ejecutarla SIEMPRE confirma en texto al usuario.',
                    parameters: z.object({
                        id: z.string().describe('ID de la cita a editar'),
                        nombre: z.string().optional(),
                        telefono: z.string().optional(),
                        fecha: z.string().optional().describe('Formato YYYY-MM-DD'),
                        hora: z.string().optional().describe('Formato HH:MM'),
                        costo: z.number().optional(),
                    }),
                    execute: async ({ id, nombre, telefono, fecha, hora, costo }) => {
                        const cita = await Cita.findOne({ _id: id, user_id: userId })
                        if (!cita) return { ok: false, error: 'La cita no existe' }

                        const nuevaFecha = fecha ?? cita.fecha
                        const nuevaHora = hora ?? cita.hora
                        const objectId = new mongoose.Types.ObjectId(id)

                        const horaDuplicada = await Cita.findOne({
                            fecha: nuevaFecha, hora: nuevaHora,
                            user_id: userId, _id: { $ne: objectId }
                        })
                        if (horaDuplicada) return { ok: false, error: 'Ya hay una cita ese día y hora' }

                        if (nombre) cita.nombre = nombre
                        if (telefono) cita.telefono = telefono
                        if (fecha) cita.fecha = fecha
                        if (hora) cita.hora = hora
                        if (costo !== undefined) cita.costo = costo

                        await cita.save()
                        return { ok: true, mensaje: `Cita de ${cita.nombre} actualizada correctamente. Responde confirmando esto al usuario en lenguaje natural.` }
                    }
                }),

                cambiarEstado: tool({
                    description: 'Cambia el estado de una cita. Después de ejecutarla SIEMPRE confirma en texto al usuario.',
                    parameters: z.object({
                        id: z.string().describe('ID de la cita'),
                        estado: z.enum(['pendiente', 'confirmada', 'completada', 'cancelada']),
                    }),
                    execute: async ({ id, estado }) => {
                        const cita = await Cita.findOne({ _id: id, user_id: userId })
                        if (!cita) return { ok: false, error: 'La cita no existe' }

                        cita.estado = estado
                        await cita.save()
                        return { ok: true, mensaje: `Cita de ${cita.nombre} marcada como ${estado}. Responde confirmando esto al usuario en lenguaje natural.` }
                    }
                }),

                eliminarCita: tool({
                    description: 'Elimina una cita del sistema. Después de ejecutarla SIEMPRE confirma en texto al usuario.',
                    parameters: z.object({
                        id: z.string().describe('ID de la cita a eliminar'),
                    }),
                    execute: async ({ id }) => {
                        const cita = await Cita.findOne({ _id: id, user_id: userId })
                        if (!cita) return { ok: false, error: 'La cita no existe' }

                        const nombre = cita.nombre
                        await cita.deleteOne()
                        return { ok: true, mensaje: `Cita de ${nombre} eliminada correctamente. Responde confirmando esto al usuario en lenguaje natural.` }
                    }
                }),
            },
            toolChoice: 'auto'
        })

        let respuesta = result.text

        if (!respuesta || respuesta.trim() === '') {
            const steps = result.steps ?? []
            for (const step of [...steps].reverse()) {
                if (step.text && step.text.trim() !== '') {
                    respuesta = step.text
                    break
                }
            }
        }

        if (!respuesta || respuesta.trim() === '') {
            respuesta = 'Listo, acción ejecutada correctamente.'
        }

        res.json({ ok: true, type: 'text', response: respuesta })

    } catch (error: any) {
        console.log(error)

        const mensaje = error?.message ?? ''

        if (mensaje.includes('rate_limit_exceeded') || mensaje.includes('Rate limit')) {
            const esTPD = mensaje.includes('tokens per day')
            const esTPM = mensaje.includes('tokens per minute')

            if (esTPD) {
                const match = mensaje.match(/try again in (.+?)\./)
                const tiempoEspera = match ? match[1] : 'unas horas'
                return res.status(429).json({
                    error: `Se agotaron los tokens disponibles. Intenta de nuevo en ${tiempoEspera}.`
                })
            }

            if (esTPM) {
                return res.status(429).json({
                    error: 'Demasiadas consultas en poco tiempo. Espera un momento e intenta de nuevo.'
                })
            }

            return res.status(429).json({
                error: 'Límite de uso alcanzado. Intenta más tarde.'
            })
        }

        res.status(500).json({ error: 'Error inesperado, intenta nuevamente' })
    }
}