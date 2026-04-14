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
Boilerplate untuk template testing

```ts
describe('Module Product', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;
    let ids: number[] = [];
    let newProduct: ProductDto | undefined = undefined;

    beforeEach(async () => {
      const credentials = {
        email: USER.email,
        password: USER.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      access_token = extractHttpOnlyCookie('access_token', cookies);
      refresh_token = extractHttpOnlyCookie('refresh_token', cookies);

      expect(refresh_token).toBeDefined();
      expect(access_token).toBeDefined();

      await request(app.getHttpServer())
        .get('/products/ids')
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200)
        .expect((res) => {
          ids = res.body.data;
        });
    });

    /**
     * Di block ini lah test case di tulis
     * contoh
     */
    test('GET /transaction + QueryTransactionDto', async () => {
      const query: QueryTransactionDto = { page: 1, per_page: 10, min_total_price: 15000, max_total_price: 100000 };
      const res = await request(app.getHttpServer())
        .get('/transaction')
        .query(query)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);
      const data = await res.body.data.data;
      const transaction = data[0];

      // Validasi tipe data menggunakan function helper base class validator, lihat di controller untuk tahu tipe dto apa yang
      // dihasilkan oleh controller endpoint yang di test
      const result = await validateDto(TransactionDto, transaction);
      expect(result).toBeInstanceOf(TransactionDto);
    });

    // Case lainnya jika controller / endpoint tidak di validate dengan dto
    test('GET /transaction/sales + QueryReportSales', async () => {
      const query: QueryReportSales = { year: 2024, month: 5 };
      const res = await request(app.getHttpServer())
        .get('/transaction/sales')
        .query(query)
        .set('Cookie', `access_token=s%3A${encodeURIComponent(access_token)}`)
        .expect(200);
      const data = await res.body.data;

      // Validate dengan fungsi validateSchema, cari tahu dari tipe return controller, schema dapat di temukan di setiap module
      //  format file lokasi schema menggunakan pattern <domain>.schema.ts
      const validate = validateSchema(ReportSalesSchema, data);
      expect(validate).toBeDefined();
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
```
