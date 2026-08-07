import { Router, type Request, type Response } from "express";
import { UserService } from "./service.js";
import { CheckUserExists } from "./middleware.js";

const UserRouter: Router = Router();

UserRouter.post("/register", (req: Request, res: Response) => {
  return UserService.Instance.registerUser(req, res);
});

UserRouter.get("/user/:userId", (req: Request, res: Response) => {
  return UserService.Instance.getUserInfoById(req, res);
});

UserRouter.get(
  "/me",
  (req, res, next) => {
    return CheckUserExists(req, res, next);
  },
  (req: Request, res: Response) => {
    return UserService.Instance.getCurrentUserInfo(req, res);
  },
);

export { UserRouter };
