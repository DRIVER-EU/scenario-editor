import m, { FactoryComponent } from 'mithril';
import { TextArea, TextInput, Select } from 'mithril-materialized';
import { IInject, InjectType, InjectLevel } from '../../models';
import { RolePlayerMessageForm, PhaseMessageForm } from '.';
import { GeoJsonMessageForm } from './geojson-message';

export const MessageForm: FactoryComponent<{ inject: IInject }> = () => {
  const getMessageForm = (inject: IInject) => {
    switch (inject.type) {
      case InjectType.ROLE_PLAYER_MESSAGE:
        return m(RolePlayerMessageForm, { inject });
      case InjectType.PHASE_MESSAGE:
        return m(PhaseMessageForm, { inject });
      case InjectType.GEOJSON_MESSAGE:
        return m(GeoJsonMessageForm, { inject });
      default:
        return m('.row', 'TODO');
    }
  };

  return {
    view: ({ attrs: { inject } }) =>
      inject.level === InjectLevel.INJECT
        ? [
            m(Select, {
              iconName: 'message',
              placeholder: 'Select the message type',
              checkedId: inject.type,
              options: [
                { id: InjectType.ROLE_PLAYER_MESSAGE, label: 'ROLE PLAYER MESSAGE' },
                { id: InjectType.POST_MESSAGE, label: 'POST A MESSAGE' },
                { id: InjectType.GEOJSON_MESSAGE, label: 'SEND A GEOJSON FILE' },
                { id: InjectType.PHASE_MESSAGE, label: 'PHASE MESSAGE' },
                { id: InjectType.AUTOMATED_ACTION, label: 'AUTOMATED ACTION' },
              ],
              onchange: (v: unknown) => (inject.type = v as InjectType),
            }),
            getMessageForm(inject),
          ]
        : m(DefaultMessageForm, { inject }),
  };
};

/**
 * Default message form with a title and description.
 */
export const DefaultMessageForm: FactoryComponent<{ inject: IInject }> = () => ({
  view: ({ attrs: { inject } }) => [
    m(TextInput, {
      id: 'title',
      initialValue: inject.title,
      onchange: (v: string) => (inject.title = v),
      label: 'Title',
      iconName: 'title',
    }),
    m(TextArea, {
      id: 'desc',
      initialValue: inject.description,
      onchange: (v: string) => (inject.description = v),
      label: 'Description',
      iconName: 'note',
    }),
  ],
});