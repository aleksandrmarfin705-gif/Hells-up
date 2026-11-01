'use client';
import { PageTitle } from '@/components/ui/ui';
import { SettingsEditor } from '@/components/layout/SettingsEditor';

export default function AdminSettings() {
  return (
    <>
      <PageTitle eyebrow="Конфигурация" title="Настройки" />
      <SettingsEditor fields={[
        { key: 'app_name', label: 'Название приложения', type: 'text' },
        { key: 'start_balance', label: 'Стартовый виртуальный баланс', type: 'int', hint: 'Выдаётся новым пользователям при первом входе' },
        { key: 'topup_amount', label: 'Бонус демо-пополнения (монет)', type: 'int', hint: '0 — отключить кнопку пополнения' },
        { key: 'topup_cooldown_seconds', label: 'Пауза между пополнениями (сек)', type: 'int' },
        { key: 'banner_title', label: 'Заголовок баннера на главной', type: 'text' },
        { key: 'banner_subtitle', label: 'Подзаголовок баннера', type: 'area' },
        { key: 'show_demo_events', label: 'Показывать демонстрационные события в ленте', type: 'bool' },
        { key: 'maintenance', label: 'Технические работы (закрыть приложение для пользователей)', type: 'bool', hint: 'Администраторы сохраняют доступ' },
        { key: 'maintenance_message', label: 'Сообщение о технических работах', type: 'area' },
      ]} />
    </>
  );
}
