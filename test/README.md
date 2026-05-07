Penamaan file dan folder structure

```
└── 📁test
    └── 📁auth
        ├── auth.e2e-spec.ts
    └── 📁common
        ├── constant.ts
        ├── mock.ts
    └── 📁product
        ├── product.e2e-spec.ts
    └── 📁utils
        ├── index.ts
    ├── app.e2e-spec.ts
    ├── jest-e2e.config.ts
    ├── jest-spec.config.ts
    ├── README.md
    └── setup_e2e.ts
```

File End To End Test menggunakan format
<domain>.e2e-spec.ts
Sedangkan Unit dan Integration Test menggunakan format ( ada didalam folder modules )
<domain>.<service/controller>.spec.ts

End To End Test
Boilerplate untuk template testing, gunakan template yang ada di `test/feature/template.e2e-spec.ts`

```ts
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { loginAdmin } from '../common/auth';

describe('Feature/Module Name', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Flow Feature', () => {
    let access_token: string;

    beforeAll(async () => {
      const session = await loginAdmin(app);
      access_token = session.accessToken;

      expect(access_token).toBeDefined();
    });

    test('METHOD /ENDPOINT - Describe test case', async () => {});
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
```

_Last Updated on 18.10 7 May 2026_