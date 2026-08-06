import { UserRepository } from "./repository.js";
import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";

const MAX_AGE_USERS = 1000 * 60 * 60 * 24; // 24 hours
const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour

export class UserService {
  private UserRepository: UserRepository;

  private static instance: UserService | null = null;

  constructor() {
    this.UserRepository = new UserRepository();
    this.cleanupRepository();
  }

  // All Api methods are implemented here, and they call the corresponding methods in the UserRepository class.
  public async getAllUsers(req: Request, res: Response) {
    return res.json({ data: await this.UserRepository.getAllUsers() });
  }

  public async getUserById(req: Request, res: Response) {
    if (!req.params.id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    return res.status(200).json({
      data: await this.UserRepository.getUserById(req.params.id),
    });
  }

  public async createUser(req: Request, res: Response) {
    if (!req.body) {
      return res.status(400).json({ error: "User data is required" });
    }

    let { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "User name is required" });
    }

    let _id = crypto.randomUUID();
    let createdAt = new Date();
    return res
      .status(201)
      .json({
        data: await this.UserRepository.createUser({ _id, name, createdAt }),
      });
  }

  public async updateUser(req: Request, res: Response) {
    if (!req.params.id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    if (!req.body) {
      return res.status(400).json({ error: "User data is required" });
    }
    return res.json({
      data: await this.UserRepository.updateUser(req.params.id, req.body),
    });
  }

  // Middlewre to check if the user exists before proceeding with the request
  public async checkUserExists(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!req.params.id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await this.UserRepository.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    next();
  }

  // Repository Cleanup method to clear users after a set interval, for demonstration purposes
  //
  private async cleanupRepository() {
    setInterval(async () => {
      const users = await this.UserRepository.getAllUsers();
      for (const user of users) {
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
