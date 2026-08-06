import { Router, type Request, type Response } from "express";
import { UserService } from "./service.js";

const UserRouter: Router = Router();

UserRouter.get("/", (req: Request, res: Response) => {
    return UserService.Instance.getAllUsers(req, res)
});

UserRouter.get("/:id", (req: Request, res: Response) => {
    return UserService.Instance.getUserById(req, res)
});


UserRouter.post("/", (req: Request, res: Response) => {
    return UserService.Instance.createUser(req, res)
});
UserRouter.put("/:id", (req: Request, res: Response) => {
    
    return UserService.Instance.updateUser(req, res)
});


export { UserRouter };
