# Tasks

## kysely integration

1. Add `.env` file.

```
  DATABASE_URL=[SQLITE_FILE_LOCATION]
  DATABASE_KEY=[CONFIG.JSON key value] e.g. 3aa09a21008545b5b8ccf9ab9e135e9fa433209d0387e5812167106bf119e7be
```

2. `yarn install` as normal.
3. Go into `node_modules/kysely-codegen` and run `yarn install` and then `yarn build`.
4. Go back to project root `cd ../../` and run `node ./node_modules/kysely-codegen/dist/bin/index.js --out-file ts/types/db.d.ts`.
5. Run app as normal.

### TODO

- [ ] Auto build kysely-codegen when doing yarn install
- [ ] Add db type generation into build commandss
- [ ] Write documentation and add to CONTRIBUTING.md?
