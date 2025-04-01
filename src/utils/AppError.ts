import AppErrorCode from "../constants/appErrorCode";
import { HttpStatusCode } from "../constants/http";

export class AppError extends Error {
  constructor(
    public readonly statusCode: HttpStatusCode,
    public readonly message: string,
    public errorCode?: string
  ) {
    super(message);
  }
}

new AppError(200, "msg", AppErrorCode.InvalidAccessToken);

export default AppError;
