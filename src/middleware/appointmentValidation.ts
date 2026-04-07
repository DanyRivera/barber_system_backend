import type { Request, Response, NextFunction } from "express";

export const appointmentValidation = (req: Request, res: Response, next: NextFunction) => {

    const { fecha_hora, telefono } = req.body;

    //Separar Fecha
    const [, horaConOffset] = fecha_hora.split('T');

    //Separar la hora del offSet que se le pasa desde el front (-06:00)
    const [hora,] = horaConOffset.split('-')

    //Que la fecha y hora sean futuras
    const fechaHoraCita = new Date(fecha_hora);
    const hoy = new Date();
    if (fechaHoraCita < hoy) {
        const error = new Error("La fecha de la cita no puede ser en el pasado");
        return res.status(400).json({ error: error.message });
    }

    //Validar el número de teléfono, acepta: 2221234567 / 222 123 4567 / 222-123-4567
    const telefonoLimpio = telefono.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(telefonoLimpio)) {
        const error = new Error("El teléfono debe tener 10 dígitos");
        return res.status(400).json({ error: error.message });
    }

    //Validar Horario barbería
    //Extraer horas y minutos de la hora seleccionada
    const [hh, mm] = hora.split(':').map(Number);
    const minutos = hh * 60 + mm;

    if (minutos < 10 * 60 || minutos > 19 * 60) {
        const error = new Error("La hora de la cita no esta dentro del horario de la barbería");
        return res.status(400).json({ error: error.message });
    }

    req.body.telefono = telefonoLimpio;

    next();

}