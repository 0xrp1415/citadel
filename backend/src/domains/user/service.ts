import { UserRepository } from "./repository.js";
import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { IUserPublic } from "./types.js";
import { sign } from "../../utils/hmac/sign.js";
import { verify } from "../../utils/hmac/verify.js";
import { config } from "dotenv";

const MAX_AGE_USERS = 1000 * 60 * 60 * 24; // 24 hours
const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
config();

export class UserService {
  private UserRepository: UserRepository;

  private static instance: UserService | null = null;

  constructor() {
    this.UserRepository = new UserRepository();
    this.cleanupRepository();
  }

  // Method to handle user registration
  public async registerUser(req: Request, res: Response) {
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!process.env.USER_SECRET_KEY)
      return res.status(500).json({ error: "Server configuration error" });

    let _id = crypto.randomUUID();
    let createdAt = new Date();
    let user: IUserPublic = await this.UserRepository.createUser({
      _id,
      name,
      createdAt,
    });

    let token = sign(_id, process.env.USER_SECRET_KEY);

    let userData = {
      name: user.name,
      createdAt: user.createdAt,
    };

    return res
      .status(201)
      .json({ message: "User created successfully", user: userData, token });
  }

  public async getUserInfoById(req: Request, res: Response) {
    let { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let user = await this.UserRepository.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let userData = {
      name: user.name,
      createdAt: user.createdAt,
    };
    return res.status(200).json({ user: userData });
  }

  public async getCurrentUserInfo(req: Request, res: Response) {
    if (!req.userID) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let user = await this.UserRepository.getUserById(req.userID);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let userData = {
      name: user.name,
      createdAt: user.createdAt,
    };
    return res.status(200).json({ user: userData });
  }
  // Middleware to check if the user exists before proceeding with the request
  public async checkUserExists(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    let [authMode, token] = req.headers.authorization?.split(" ") || ["", ""];

    if (authMode !== "Bearer" || !token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!process.env.USER_SECRET_KEY) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    let userId;
    try {
      userId = verify(token, process.env.USER_SECRET_KEY);
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.userID = userId;
    next();
  }

  // Repository Cleanup method to clear users after a set interval, for demonstration purposes
  private async cleanupRepository() {
    setInterval(async () => {
      let users = await this.UserRepository.getAllUsers();
      for (let user of users) {
        if (user.createdAt < new Date(Date.now() - MAX_AGE_USERS)) {
          await this.UserRepository.deleteUser(user._id);
        }
      }
    }, CLEANUP_INTERVAL).unref();
  }

  // Singleton pattern to ensure only one instance of UserService exists
  public static get Instance() {
    if (this.instance === null) this.instance = new UserService();

    return this.instance;
  }
}
