import m, { FactoryComponent } from 'mithril';
import { TextArea, TextInput, Select, Collection, CollectionMode, Icon, FlatButton } from 'mithril-materialized';
import {
  getMessage,
  IInject,
  MessageType,
  UserRole,
  IRolePlayerMsg,
  RolePlayerMessageType,
  IPerson,
  IExecutingInject,
  InjectKeys,
} from '../../../../models';
import { TrialSvc, RunSvc } from '../../services';
import { createEmailLink, createPhoneLink, getRolePlayerMessageIcon } from '../../utils';
import { MessageScope } from '.';

export const RolePlayerMessageForm: FactoryComponent<{
  inject: IInject;
  onChange?: (i: IInject, prop: InjectKeys) => void;
  disabled?: boolean;
  checkpoint?: boolean;
  scope: MessageScope;
}> = () => {
  return {
    view: ({ attrs: { inject, disabled, checkpoint = false, onChange, scope } }) => {
      const update = (prop: keyof IInject | Array<keyof IInject>) => onChange && onChange(inject, prop);
      const svc = scope === 'edit' ? TrialSvc : RunSvc;
      const rpm = getMessage<IRolePlayerMsg>(inject, MessageType.ROLE_PLAYER_MESSAGE);
      const rolePlayers = svc.getUsersByRole(UserRole.ROLE_PLAYER).map(rp => ({ id: rp.id, label: rp.name }));
      const participants = svc.getUsersByRole(UserRole.PARTICIPANT).map(rp => ({ id: rp.id, label: rp.name }));
      const types = Object.keys(RolePlayerMessageType).map(t => ({ id: t, label: t }));
      if (checkpoint) {
        rpm.type = RolePlayerMessageType.ACTION;
      }
      const isAction = rpm.type === RolePlayerMessageType.ACTION;
      if (rpm && !rpm.rolePlayerId && rolePlayers && rolePlayers.length === 1) {
        rpm.rolePlayerId = rolePlayers[0].id;
      }

      return [
        m(Select, {
          disabled,
          label: 'Role player',
          iconName: 'record_voice_over',
          className: checkpoint ? 'col s12' : isAction ? 'col s12 m6' : 'col s12 m3',
          placeholder: 'Pick role player',
          options: rolePlayers,
          checkedId: rpm.rolePlayerId,
          onchange: v => {
            rpm.rolePlayerId = v[0] as string;
            update('message');
          },
        }),
        checkpoint
          ? undefined
          : m(Select, {
              disabled,
              label: 'Message type',
              iconName: getRolePlayerMessageIcon(rpm.type),
              className: isAction ? 'col s12 m6' : 'col s12 m3',
              placeholder: 'Select type',
              options: types,
              checkedId: rpm.type,
              onchange: v => {
                rpm.type = v[0] as RolePlayerMessageType;
                update('message');
              },
            }),
        isAction
          ? undefined
          : m(Select, {
              label: 'Participant(s)',
              id: 'person',
              disabled,
              iconName: 'people',
              className: 'col s12 m6',
              placeholder: 'Pick one or more',
              multiple: true,
              options: participants,
              initialValue: rpm.participantIds,
              onchange: v => {
                rpm.participantIds = v as string[];
                update('message');
              },
            }),
        m(TextInput, {
          disabled,
          id: 'headline',
          initialValue: rpm.headline || rpm.title,
          onchange: (v: string) => {
            inject.title = rpm.headline = v;
            update(['title', 'message']);
          },
          label: checkpoint ? 'Check' : isAction ? 'Headline' : 'Subject',
          iconName: checkpoint ? getRolePlayerMessageIcon(rpm.type) : 'title',
          className: 'col s12',
        }),
        m(TextArea, {
          disabled,
          id: 'desc',
          initialValue: rpm.description as string,
          onchange: (v: string) => {
            inject.description = rpm.description = v;
            update(['description', 'message']);
          },
          label: 'Description',
          iconName: 'note',
        }),
      ];
    },
  };
};

/** A static view on a role player message, i.e. without the possibility to change it */
export const RolePlayerMessageView: FactoryComponent<{
  inject: IExecutingInject;
  disabled?: boolean;
}> = () => {
  const msgDetails = (rpm: IRolePlayerMsg, rolePlayer: IPerson, participants?: IPerson[]) => {
    switch (rpm.type) {
      case RolePlayerMessageType.ACTION:
        return m('.action');
      case RolePlayerMessageType.MESSAGE:
      case RolePlayerMessageType.CALL:
        return m('.call', [
          m('h6', 'Intended for the following participants'),
          participants
            ? m(Collection, {
                mode: CollectionMode.BASIC,
                items: participants.map(p => ({
                  title: m('ul.list-inline', [
                    m('li', m('b', `${p.name}: `)),
                    m('li', p.mobile ? m('a', { href: createPhoneLink(p.mobile) }, p.mobile) : ''),
                    m('li', p.mobile ? '(m)' : ''),
                    m('li', p.phone ? ', ' : ''),
                    m('li', p.phone ? m('a', { href: createPhoneLink(p.phone) }, p.phone) : ''),
                    m('li', p.phone ? '(p)' : ''),
                  ]),
                })),
              })
            : undefined,
        ]);
      case RolePlayerMessageType.MAIL:
        const emails = participants ? participants.filter(p => p.email).map(p => p.email) : undefined;
        return m('.mail', [
          emails
            ? m(FlatButton, {
                iconName: 'email',
                label: 'Send email',
                href: createEmailLink(emails, rpm.headline, rpm.description),
              })
            : undefined,
          participants
            ? m(Collection, {
                mode: CollectionMode.BASIC,
                items: participants.map(p => ({
                  title: `${p.name}: ${p.email ? p.email : ''}`,
                })),
              })
            : undefined,
        ]);
      case RolePlayerMessageType.TWEET:
        return m('.tweet');
      default:
        return undefined;
    }
  };

  return {
    view: ({ attrs: { inject } }) => {
      const rpm = getMessage<IRolePlayerMsg>(inject, MessageType.ROLE_PLAYER_MESSAGE);
      const rolePlayer =
        RunSvc.getUsers()
          .filter(u => u.id === rpm.rolePlayerId)
          .shift() || ({} as IPerson);
      const participants = RunSvc.getUsers().filter(u =>
        rpm.participantIds && rpm.participantIds.indexOf(u.id) >= 0 ? true : false
      );
      return [
        m(
          '.row',
          m(
            '.col.s12',
            m('h5', [
              m(Icon, { iconName: getRolePlayerMessageIcon(rpm.type) }),
              ` ${rpm.headline} [${rolePlayer.name}]`,
            ])
          )
        ),
        m(
          '.row',
          m('.col.s12', [
            rpm.description ? m('p', rpm.description) : undefined,
            msgDetails(rpm, rolePlayer, participants),
          ])
        ),
      ];
    },
  };
};
