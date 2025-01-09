import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
