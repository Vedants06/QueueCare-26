import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QueueCure — Receptionist',
  description: 'Clinic queue management dashboard',
};

export default function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}