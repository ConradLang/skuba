# <%- repoName %>

[![Powered by skuba](https://img.shields.io/badge/🤿%20skuba-powered-009DC4)](https://github.com/seek-oss/skuba)

Next steps:

1. [ ] Finish templating if this was skipped earlier:

   ```shell
   yarn skuba configure
   ```

2. [ ] Create a new repository in the appropriate GitHub organisation.
3. [ ] Add the repository to BuildAgency;
       see [Builds at SEEK] for more information.
4. [ ] Push local commits to the upstream GitHub branch.
5. [ ] Configure [GitHub repository settings].
6. [ ] Delete this checklist 😌.

[builds at seek]: https://builds-at-seek.ssod.skinfra.xyz
[github repository settings]: https://github.com/<%-orgName%>/<%-repoName%>/settings

## Design

The `greeter` template is the prototypical _hello world_ project.
It can function as a playground for the TypeScript tooling prescribed by our [technology strategy],
or serve as a starting point for a backend project if the other built-in templates are not a good fit.

It's a barebones Node.js application that comprises:

- A [src/app.ts](src/app.ts) that can be run locally to greet the user
- A [src/app.test.ts](src/app.test.ts) that demonstrates rudimentary Jest usage

## Development

### Test

```shell
yarn test
```

### Lint

```shell
# Fix issues
yarn format

# Check for issues
yarn lint
```

### Start

```shell
# Start a live-reloading process
yarn start

# Start with Node.js Inspector enabled
yarn start:debug
```

This runs a live-reloading Node.js process pointing to the [src/app.ts](src/app.ts) entrypoint.

## Deploy

The `greeter` template includes a simple [Buildkite pipeline](.buildkite/pipeline.yml) for testing and linting.
It does not assume a deployment method or environment.

For inspiration in this space, check out:

- The `koa-rest-api` template for containerised deployments
- The `lambda-sqs-worker` template for Lambda deployments

## Support

### Dev

TODO: add support links for the dev environment.

<!--
- CloudWatch dashboard
- Datadog dashboard
- Splunk logs
-->

### Prod

TODO: add support links for the prod environment.

<!--
- CloudWatch dashboard
- Datadog dashboard
- Splunk logs
-->

[technology strategy]: https://tech-strategy.ssod.skinfra.xyz
