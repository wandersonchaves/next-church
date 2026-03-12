import type { Metadata } from 'next';
import { UserProfile } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { getI18nPath } from '@/utils/Helpers';
import { getI18nMetadata } from '@/utils/I18nMetadata';

type UserProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: UserProfilePageProps): Promise<Metadata> {
  return getI18nMetadata('UserProfile', props.params);
}

export default async function UserProfilePage(props: UserProfilePageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="my-6 lg:-ml-12">
      <UserProfile
        path={getI18nPath('/dashboard/user-profile', locale)}
      />
    </div>
  );
};
