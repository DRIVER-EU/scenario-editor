import m, { FactoryComponent } from 'mithril';
import { StakeholdersForm } from './stakeholders-form';
import { TrialSvc } from '../../services';
import { IStakeholder } from 'trial-manager-models';
import { stakeholdersChannel, TopicNames } from '../../models';
import { RoundIconButton, TextInput, Collection, CollectionMode } from 'mithril-materialized';
import { uniqueId } from '../../utils';

const StakeholdersList: FactoryComponent<IStakeholder> = () => {
  const state = {
    filterValue: '' as string | undefined,
    curStakeholderId: undefined as string | undefined,
    subscription: stakeholdersChannel.subscribe(TopicNames.ITEM, ({ cur }) => {
      state.curStakeholderId = cur.id;
    }),
  };
  return {
    onremove: () => state.subscription.unsubscribe(),
    view: () => {
      const stakeholders = TrialSvc.getStakeholders(state.filterValue);
      return [
        m('.row', [
          m(RoundIconButton, {
            iconName: 'add',
            class: 'green right',
            onclick: async () => {
              const sh = {
                id: uniqueId(),
                name: 'New stakeholder',
              } as IStakeholder;
              state.curStakeholderId = sh.id;
              await TrialSvc.createStakeholder(sh);
            },
          }),
          m(TextInput, {
            label: 'Filter',
            id: 'filter',
            iconName: 'filter_list',
            onkeyup: (ev: KeyboardEvent, v?: string) => (state.filterValue = v),
            contentClass: 'right',
          }),
        ]),
        stakeholders
          ? m(
              '.row.sb',
              m(
                '.col.s12',
                m(
                  Collection,
                  {
                    mode: CollectionMode.AVATAR,
                    items: stakeholders.map(cur => ({
                      title: cur.name || '?',
                      avatar: 'person_outline',
                      className: 'yellow black-text',
                      active: state.curStakeholderId === cur.id,
                      content:
                        cur.notes +
                        '<br>' +
                        (cur.contactIds
                          ? cur.contactIds
                              .map(id => TrialSvc.getUserById(id))
                              .map(c => c && c.name)
                              .join(', ')
                          : ''),
                      onclick: () => {
                        stakeholdersChannel.publish(TopicNames.ITEM_SELECT, { cur });
                        state.curStakeholderId = cur.id;
                      },
                    })),
                  }
                )
              )
            )
          : undefined,
      ];
    },
  };
};

export const StakeholdersView = () => {
  return {
    view: () => m('.row', [m('.col.s12.m4.l3', m(StakeholdersList)), m('.col.s12.m8.l9', m(StakeholdersForm))]),
  };
};
