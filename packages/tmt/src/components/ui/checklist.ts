import m, { FactoryComponent } from 'mithril';
import { IScenario, ITodo, InjectKeys, IInject } from '../../../../models';
import { FlatButton, Kanban, IModelField, IKanban } from 'mithril-materialized';

export const Checklist: FactoryComponent<{
  scenario: IScenario;
  disabled?: boolean;
  onChange?: (i: IInject, prop: InjectKeys) => void;
}> = () => {
  const state = { key: 0 } as { key: number; onChange?: (i: IInject, prop: InjectKeys) => void };

  const model = [
    {
      id: 'title',
      label: 'Todo',
      component: 'text',
      className: 'col s12',
      required: true,
    },
    {
      id: 'id',
      autogenerate: 'guid',
    },
  ] as IModelField[];

  const disabledModel = [
    {
      id: 'title',
      label: 'Todo',
      component: 'text',
      className: 'col s9',
      required: true,
    },
    {
      id: 'done',
      label: 'Done',
      component: 'checkbox',
      className: 'col s3',
    },
  ] as IModelField[];

  const onchange = (scenario: IScenario, type: 'before' | 'after') => (items: ITodo[]) => {
    const { onChange = () => undefined } = state;
    if (type === 'before') {
      scenario.todoBefore = items as ITodo[];
      onChange(scenario, 'todoBefore');
    } else {
      scenario.todoAfter = items;
      onChange(scenario, 'todoAfter');
    }
  };

  return {
    oninit: ({ attrs: { onChange } }) => {
      state.onChange = onChange;
    },
    view: ({ attrs: { scenario, disabled = false } }) => {
      const { key } = state;
      const { todoBefore, todoAfter } = scenario;
      return disabled === false || todoBefore || todoAfter
        ? m('.row', [
            m('.col.s6', [
              disabled ? m('h6', 'BEFORE') : undefined,
              [
                m(Kanban, {
                  key: `before${key}`,
                  disabled,
                  label: 'todo (BEFORE)',
                  canDrag: true,
                  model: disabled ? disabledModel : model,
                  onchange: onchange(scenario, 'before'),
                  items: todoBefore,
                  editableIds: disabled ? ['done'] : undefined,
                } as IKanban<ITodo>),
              ],
            ]),
            m('.col.s6', [
              disabled ? m('h6', 'AFTER') : undefined,
              [
                m(Kanban, {
                  key: `after${key}`,
                  disabled,
                  label: 'todo (AFTER)',
                  canDrag: true,
                  model: disabled ? disabledModel : model,
                  onchange: onchange(scenario, 'after'),
                  items: todoAfter,
                  editableIds: disabled ? ['done'] : undefined,
                } as IKanban<ITodo>),
              ],
            ]),
            disabled &&
              m(
                '.row',
                m(
                  '.col.s12',
                  m(FlatButton, {
                    label: 'Clear all todos',
                    iconName: 'clear_all',
                    onclick: () => {
                      if (todoBefore) {
                        scenario.todoBefore = todoBefore.map(todo => ({ ...todo, done: false }));
                        onchange(scenario, 'before');
                      }
                      if (todoAfter) {
                        scenario.todoAfter = todoAfter.map(todo => ({ ...todo, done: false }));
                        onchange(scenario, 'after');
                      }
                      state.key++;
                    },
                  })
                )
              ),
          ])
        : undefined;
    },
  };
};
