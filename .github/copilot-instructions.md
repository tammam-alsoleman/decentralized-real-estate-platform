# Copilot Review Instructions

Review this repository as a Docker-ready microservices monorepo for a decentralized AI-driven real estate platform.

Focus on:
- Clean Architecture boundaries in backend services.
- API Gateway must not contain business logic.
- API Gateway must not call Blockchain Service directly.
- Internal service communication should use gRPC.
- Async communication should use RabbitMQ events.
- Do not allow secrets or `.env` files to be committed.
- Dockerfiles and docker-compose changes must be consistent.
- Auth Service owns legal identity data.
- Property Service must not access auth_schema directly.
- Contract verification in MVP must use Property Service stored result, not direct ledger read.

For NestJS services:
- Controllers should stay thin.
- Use cases should contain application logic.
- Infrastructure code should implement ports.
- Domain should not depend on NestJS, Prisma, RabbitMQ, or JWT libraries.