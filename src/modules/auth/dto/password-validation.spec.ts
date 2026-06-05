import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from '~/modules/users/dto/create-user.dto';
import { SignUpDto } from './sign-up.dto';

type PasswordDtoClass = new () => { password: string };

async function getPasswordConstraints(dtoClass: PasswordDtoClass, password: string): Promise<Record<string, string>> {
  const dto = plainToInstance(
    dtoClass,
    {
      name: 'Test User',
      email: 'test.user@example.com',
      password,
    },
    { excludeExtraneousValues: true },
  );

  const errors = await validate(dto);
  return errors.find((error) => error.property === 'password')?.constraints ?? {};
}

describe.each([
  ['SignUpDto', SignUpDto],
  ['CreateUserDto', CreateUserDto],
] satisfies Array<[string, PasswordDtoClass]>)('%s password validation', (_name, dtoClass) => {
  it('accepts password with minimum length, lowercase, uppercase, number, and symbol', async () => {
    await expect(getPasswordConstraints(dtoClass, 'Pass1!')).resolves.toEqual({});
  });

  it.each([
    ['too short', 'Pa1!'],
    ['without lowercase', 'PASSWORD1!'],
    ['without uppercase', 'password1!'],
    ['without number', 'Password!'],
    ['without symbol', 'Password1'],
  ])('rejects password %s', async (_case, password) => {
    await expect(getPasswordConstraints(dtoClass, password)).resolves.not.toEqual({});
  });
});
