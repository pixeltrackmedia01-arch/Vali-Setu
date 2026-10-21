import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash_: Promise<string> | undefined;

/** Compared against when the user does not exist, so timing does not reveal valid emails. */
export function dummyHash(): Promise<string> {
  dummyHash_ ??= hashPassword("not-a-real-password");
  return dummyHash_;
}
