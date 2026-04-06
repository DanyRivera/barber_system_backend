import { Router } from "express";
import { body } from "express-validator";
import 'dotenv/config'

import { createAccount, getUser, login, updateProfile, createAppointment } from "./handlers";
import { handleErrors } from "./middleware/validation";
import { authenticate } from "./middleware/auth";

const router = Router();

router.post('/registro',
    body('nombre')
        .notEmpty()
        .withMessage("El nombre no puede ir vacío"),
    body('apellido')
        .notEmpty()
        .withMessage("El apellido no puede ir vacío"),
    body('email')
        .isEmail()
        .withMessage("Email no válido"),
    body('password')
        .isLength({ min: 8 })
        .withMessage("The password must be at least 8 characters."),

    handleErrors,

    createAccount
)

router.post('/login',

    body('email')
        .isEmail()
        .withMessage("Email no válido"),
    body('password')
        .notEmpty()
        .withMessage("El password no puede ir vacío"),

    handleErrors,

    login
)

router.get('/user', authenticate, getUser)

router.put('/user',

    authenticate,

    body('nombre')
        .notEmpty()
        .withMessage('El nombre es obligatorio'),
    body('apellido')
        .notEmpty()
        .withMessage('El apellido es obligatorio'),
    body('email')
        .isEmail()
        .withMessage("Email no válido"),

    handleErrors,

    updateProfile
)

router.post('/cita',

    authenticate,

    body('nombre')
        .notEmpty()
        .withMessage('El nombre es obligatorio'),

    body('telefono')
        .notEmpty()
        .withMessage('El telefono es obligatorio'),

    body('fecha_hora')
        .notEmpty()
        .withMessage('La fecha y hora son obligatorios'),


    handleErrors,

    createAppointment
)

export default router;