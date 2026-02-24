import { Router } from "express";
import { body } from "express-validator";
import 'dotenv/config'

import { createAccount, login } from "./handlers";
import { handleErrors } from "./middleware/validation";

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
        .isLength({min: 8})
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

export default router;