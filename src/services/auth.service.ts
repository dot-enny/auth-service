import { hashPassword } from "../auth.utils.js";
import { createUser, findUserByEmail } from "../repositories/auth.repository.js";

export const registerUser = async (email: string, password: string) => {
    const existingUser = await findUserByEmail(email);

    if (existingUser) throw new Error("USER_ALREADY_EXISTS");

    const passwordHash = await hashPassword(password);

    const record = createUser(email, passwordHash)
    
    return record;
}