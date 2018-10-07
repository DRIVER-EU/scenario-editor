import { InjectLevel } from './../../../../server/src/models/inject-level';
import { Inject } from './../../../../server/src/inject/inject.entity';
import m from 'mithril';
import { inputTextArea, inputText, button, smallIcon } from '../../utils/html';
import { ISubscriptionDefinition } from '../../services/message-bus-service';
import { TopicNames, injectChannel } from '../../models/channels';
import { deepCopy, deepEqual, getInjectIcon } from '../../utils/utils';
import { InjectSvc } from '../../services/inject-service';
// import { InjectType } from '../../models/inject';
import { DropDownObjectives } from '../ui/drop-down-objectives';

const log = console.log;

export const InjectsForm = () => {
  const state = {
    parent: undefined as Inject | undefined,
    inject: undefined as Inject | undefined,
    original: undefined as Inject | undefined,
    subscription: {} as ISubscriptionDefinition<any>,
  };

  const getParent = (id: string) =>
    InjectSvc.getList()
      .filter(o => o.id === id)
      .shift();

  return {
    oninit: () => {
      state.subscription = injectChannel.subscribe(
        TopicNames.ITEM,
        ({ cur }) => {
          state.inject = cur && cur.id ? deepCopy(cur) : undefined;
          state.original = cur && cur.id ? deepCopy(cur) : undefined;
          state.parent = cur.parentId ? getParent(cur.parentId) : undefined;
        }
      );
    },
    onbeforeremove: () => {
      state.subscription.unsubscribe();
    },
    view: () => {
      const inject = state.inject;
      const hasChanged = !deepEqual(inject, state.original);
      return m(
        '.injects-form',
        { style: 'color: black' },
        m(
          'form.col.s12',
          {
            onsubmit: (e: UIEvent) => {
              e.preventDefault();
              log('submitting...');
              if (inject) {
                InjectSvc.update(inject);
              }
            },
          },
          [
            m(
              '.row',
              inject
                ? [
                    m('h4', [
                      smallIcon(getInjectIcon(inject.level), {
                        style: 'margin-right: 12px;',
                      }),
                      inject.level,
                    ]),
                    [
                      inputText({
                        id: 'title',
                        initialValue: inject.title,
                        onchange: (v: string) => (inject.title = v),
                        label: 'Title',
                        iconName: 'title',
                        classNames: 'active',
                      }),
                      inputTextArea({
                        id: 'desc',
                        initialValue: inject.description,
                        onchange: (v: string) => (inject.description = v),
                        label: 'Description',
                        iconName: 'description',
                        classNames: 'active',
                      }),
                      inject.level === InjectLevel.INJECT
                        ? ''
                        : m('.row', [
                            m(
                              '.col.s6',
                              m(DropDownObjectives, {
                                title: 'Main objective',
                                objectiveId: inject.mainObjectiveId,
                                onchange: (id: string) =>
                                  (inject.mainObjectiveId = id),
                              })
                            ),
                            m(
                              '.col.s6',
                              m(DropDownObjectives, {
                                title: 'Secondary objective',
                                objectiveId: inject.secondaryObjectiveId,
                                onchange: (id: string) =>
                                  (inject.secondaryObjectiveId = id),
                              })
                            ),
                          ]),
                    ],
                    m('row', [
                      button({
                        iconName: 'undo',
                        ui: {
                          class: `green ${hasChanged ? '' : 'disabled'}`,
                          onclick: () =>
                            (state.inject = deepCopy(state.original)),
                        },
                      }),
                      ' ',
                      button({
                        iconName: 'save',
                        ui: {
                          class: `green ${hasChanged ? '' : 'disabled'}`,
                          type: 'submit',
                        },
                      }),
                      ' ',
                      button({
                        iconName: 'delete',
                        ui: {
                          class: 'red',
                          onclick: () => InjectSvc.delete(inject.id),
                        },
                      }),
                    ]),
                  ]
                : []
            ),
          ]
        )
      );
    },
  };
};
