import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Wraps argon2 so services depend on an injectable class (easy to mock in unit tests).
@Injectable()
export class PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
