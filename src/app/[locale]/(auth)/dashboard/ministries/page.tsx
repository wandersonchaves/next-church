import { auth } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { db } from '@/libs/DB';
import { members, ministries } from '@/models/Schema';
import MinistriesClient from './MinistriesClient';

export default async function MinistriesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const { orgId } = await auth();
  setRequestLocale(locale);

  if (!orgId) {
    return null;
  }

  // 1. Busca Ministérios com IDs de líderes para possibilitar a edição
  const initialMinistries = await db
    .select({
      id: ministries.id,
      name: ministries.name,
      description: ministries.description,
      leaderId: ministries.leaderId,
      leaderName: sql<string>`${members.firstName} || ' ' || ${members.lastName}`,
    })
    .from(ministries)
    .leftJoin(members, eq(ministries.leaderId, members.id))
    .where(eq(ministries.organizationId, orgId));

  // 2. Busca lista de membros para o autocomplete
  const allMembers = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(members)
    .where(eq(members.organizationId, orgId));

  return (
    <MinistriesClient
      initialMinistries={initialMinistries}
      members={allMembers}
    />
  );
}
