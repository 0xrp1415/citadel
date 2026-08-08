import { Router } from "express";
import { GameRoomService } from "./service.js";
import { CheckUserExists } from "../user/middleware.js";
import { IGameRoomRequest } from "./types.js";

let GameRoomRouter: Router = Router();

GameRoomRouter.post(
  "/create",
  (req, res, next) => {
    CheckUserExists(req, res, next);
  },
  (req, res) => {
    GameRoomService.Instance.createGameRoom(req, res);
  },
);

GameRoomRouter.post(
  "/join/:inviteCode",
  (req, res, next) => CheckUserExists(req, res, next),
  (req, res) => {
    GameRoomService.Instance.joinGameRoom(req, res);
  },
);

GameRoomRouter.post(
  "/leave",
  (req, res, next) => {
    return GameRoomService.Instance.verifyGameRoomRest(
      req as IGameRoomRequest,
      res,
      next,
    );
  },
  (req, res) => {
    GameRoomService.Instance.leaveGameRoom(req as IGameRoomRequest, res);
  },
);

export { GameRoomRouter };
