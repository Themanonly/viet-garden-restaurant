import { AdminShell } from '../../../components/admin-shell';
import { OrderingChannelsManager } from '../../../components/ordering-channels-manager';
import { createAdminOrderingChannel, deleteAdminOrderingChannel, readAdminMedia, readAdminOrderingChannels, reorderAdminOrderingChannels, updateAdminOrderingChannel } from '../../../content/admin-menu-actions';

export default function AdminOrderingPage() {
  return <AdminShell title="Ordering Channels"><OrderingChannelsManager serverActions={{ readAdminOrderingChannels, createAdminOrderingChannel, updateAdminOrderingChannel, deleteAdminOrderingChannel, reorderAdminOrderingChannels, readAdminMedia }} /></AdminShell>;
}
