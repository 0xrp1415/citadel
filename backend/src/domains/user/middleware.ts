import { UserService } from "./service.js";
import type { NextFunction, Request, Response } from "express";

export function CheckUserExists(req: Request, res: Response, next: NextFunction) {
  UserService.Instance.checkUserExists(req, res, next);
}


