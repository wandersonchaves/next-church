# NextChurch - High-Performance G12 Management Hub ⛪🚀

**NextChurch** is an enterprise-grade Church Management System (CMS) specifically designed for the **G12 Discipleship Model** (1-12-144). Built with cutting-edge technology, it empowers church leaders to scale their vision while maintaining personal care for every individual.

## 🌟 Visionary Features

- **Hierarchical Lineage (G12 Tree)**: Visual and data-driven management of spiritual lineages using DFS (Depth-First Search) algorithms for maximum precision.
- **Journey Progress Tracking**: Monitor members through the 7 strategic steps of spiritual growth (Decision to Sending).
- **Intelligent Communication**: Native WhatsApp integration for automated welcome messages, birthday greetings, and leadership reports.
- **Ministries & Sectors**: Manage volunteers and teams (Worship, Media, Kids Hub) with many-to-many relationships and specific roles.
- **Audit & Transparency**: Full traceability of administrative actions, providing security and accountability for the leadership.
- **Enterprise SaaS Architecture**: Multi-tenant isolation ensuring that each congregation has its own private and secure environment.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Actions, RSC)
- **Database/ORM**: [Drizzle ORM](https://orm.drizzle.team/) with [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: [Clerk](https://clerk.com/) (Organization-based multi-tenancy)
- **Background Tasks**: [Inngest](https://www.inngest.com/) (Event-driven workflows and crons)
- **Messaging**: [Evolution API](https://evolution-api.com/) (WhatsApp V2)
- **Security**: [Arcjet](https://arcjet.com/) (Bot protection and Shield)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)

## 🚀 Getting Started

1. **Clone the repo**
2. **Install dependencies**: `npm install`
3. **Set up environment variables**: Copy `.env.example` to `.env`
4. **Run database migrations**: `npm run db:push`
5. **Start dev server**: `npm run dev`

---

Developed with passion by [Wanderson Chaves](https://github.com/wandersonchaves).
*Next Church standard of excellence, powered by NextChurch technology.*
