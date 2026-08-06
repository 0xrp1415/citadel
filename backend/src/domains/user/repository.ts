import { IUser } from "./types.js";

export class UserRepository {
    
    private UserMap: Map<string, IUser> = new Map<string, IUser>();
    
    public async createUser(user: IUser): Promise<IUser> {
        this.UserMap.set(user._id, user);
        return user;
    }

    public async getAllUsers(): Promise<IUser[]> {
        return Array.from(this.UserMap.values());
    }

    public async getUserById(userId: string): Promise<IUser | null> {
        return this.UserMap.get(userId) || null;
    }

    public async updateUser(userId: string, user: IUser): Promise<IUser> {
        this.UserMap.set(userId, user);
        return user;
    }

    public async deleteUser(userId: string): Promise<boolean> {
        return this.UserMap.delete(userId);
    }
}