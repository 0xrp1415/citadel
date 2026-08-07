export interface IUser
{
    _id: string;
    name: string;
    createdAt: Date;
}


export interface IUserPublic
{
    name: string;
    createdAt: Date;
}

declare global
{
    namespace Express
    {
        interface Request
        {
            userID?: string;
        }
    }
}