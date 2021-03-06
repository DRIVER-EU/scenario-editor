import m, { FactoryComponent } from 'mithril';
import {
  IInject,
  InjectType,
  InjectState,
  InjectConditionType,
  IInjectCondition,
  IScenario,
  getParent,
  getInject,
  isAncestor,
  UserRole,
} from '../../../../models';
import { Select, NumberInput, IInputOption, TimePicker } from 'mithril-materialized';
import { TrialSvc } from '../../services';
import { padLeft } from '../../utils';

/*
# Inject conditions

An inject can occur after a number of conditions:

Time-based conditions are all delays:

- After a fixed delay (in seconds/minutes/hours)
- Immediately after the previous inject (which is a fixed delay of 0 sec)
- At a certain time (which is also a fixed delay, but relative to the scenario start time)

Optionally, you may need to satisfy certain conditions:

- Another inject is completed (actually, this is a bit more generic, as we normally wait for the previous inject)

## Examples

For regular injects:

- Start manually (after some time after the previous inject)
- Start immediately (after the previous inject)
- Start after 5 minutes (after the previous inject)

For acts and storylines, which are at the beginning of a sequence

- Start at 9:00 (after the 'start' inject)
- As above, after [act|storyline|scenario] [name of act|storyline] has [started|finished]

*/

/** Allows to set the inject conditions, i.e. when does the inject get executed. */
export const InjectConditions: FactoryComponent<{
  injects: IInject[];
  inject: IInject;
  previousInjects: IInject[];
  disabled?: boolean;
  onChange: (i: IInject, prop: keyof IInject | Array<keyof IInject>) => void;
}> = () => {
  const state = {
    dropdownOptions: { container: document.body, constrainWidth: false },
  } as {
    dropdownOptions: Partial<M.DropdownOptions>;
  };
  const rolePlayers = TrialSvc.getUsersByRole(UserRole.ROLE_PLAYER).map((rp) => ({ id: rp.id, label: rp.name }));
  const style = 'margin: 0 auto;';

  return {
    view: ({ attrs: { injects, inject, previousInjects, disabled = false, onChange: oc } }) => {
      const onChange = (i: IInject) => oc(i, 'condition');
      const { dropdownOptions } = state;
      // console.table(inject);
      if (!inject || inject.type === InjectType.SCENARIO) {
        return undefined;
      }
      if (!inject.condition) {
        inject.condition = {
          type: InjectConditionType.IMMEDIATELY,
          delay: 0,
          delayUnitType: 'seconds',
          injectState: InjectState.EXECUTED,
        } as IInjectCondition;
      }
      const {
        condition: { injectId, injectState, type, rolePlayerId },
      } = inject;
      // console.table(condition);
      const dependency = getInject(injectId, TrialSvc.getInjects());
      const previousInjectOptions = previousInjects.map((i) => ({ id: i.id, label: i.title }));
      const injectStateOptions: IInputOption[] =
        dependency && !isAncestor(injects, inject, dependency) ? [{ id: InjectState.EXECUTED, label: 'ended' }] : [];
      injectStateOptions.push({
        id: InjectState.IN_PROGRESS,
        // disabled: dependency && dependency.type === InjectType.SCENARIO,
        label: 'started',
      });
      if (!injectId && previousInjectOptions.length > 0) {
        inject.condition.injectId = previousInjectOptions[previousInjectOptions.length - 1].id as string;
      }
      if (injectStateOptions.filter((iso) => iso.id === injectState).length === 0) {
        inject.condition.injectState = injectStateOptions[0].id as InjectState;
      }
      return m(
        '.row',
        m('.col.s12', [
          // m('h5', 'Start condition'),
          // m(Icon, { iconName: 'playlist_play', class: 'small', style: 'margin: 0 0.5em;' }),
          m('span.inline', 'Start'),
          m(Select, {
            disabled,
            style,
            className: 'inline medium',
            placeholder: 'Pick one',
            isMandatory: true,
            checkedId: type,
            options: [
              { id: InjectConditionType.MANUALLY, label: 'manually' },
              { id: InjectConditionType.IMMEDIATELY, label: 'immediately' },
              { id: InjectConditionType.DELAY, label: 'after' },
              {
                id: InjectConditionType.AT_TIME,
                label: 'at',
                disabled: !TrialSvc.getCurrent(),
              },
            ],
            onchange: (v) => {
              if (
                inject.condition &&
                inject.condition.type === InjectConditionType.AT_TIME &&
                (v[0] as InjectConditionType) !== InjectConditionType.AT_TIME
              ) {
                inject.condition.delay = 0;
              }
              inject.condition!.type = v[0] as InjectConditionType;
              // state.inject!.condition = condition;
              onChange(inject);
            },
          }),
          type === InjectConditionType.MANUALLY && [
            m('span.inline', 'by'),
            m(Select, {
              disabled,
              style,
              placeholder: 'Role player',
              className: 'inline',
              options: rolePlayers,
              checkedId: rolePlayerId,
              onchange: (v) => {
                inject.condition!.rolePlayerId = v[0] as string;
                // state.inject!.condition! = condition;
                onChange(inject);
              },
            }),
          ],
          type === InjectConditionType.AT_TIME
            ? m(StartAt, { disabled, condition: inject.condition, inject, onChange })
            : [
                m(Delay, { disabled, inject, onChange }),
                m('span.inline', 'after'),
                m(Select, {
                  dropdownOptions,
                  disabled,
                  style,
                  placeholder: 'Pick one',
                  className: 'inline',
                  checkedId: injectId,
                  options: previousInjectOptions,
                  onchange: (v) => {
                    inject.condition!.injectId = v[0] as InjectConditionType;
                    // state.inject!.condition = condition;
                    onChange(inject);
                  },
                }),
                m('span.inline', 'has'),
                m(Select, {
                  disabled,
                  style,
                  placeholder: 'When...',
                  className: 'inline small',
                  checkedId: injectState,
                  options: injectStateOptions,
                  onchange: (v) => {
                    inject.condition!.injectState = v[0] as InjectState;
                    // state.inject!.condition = condition;
                    onChange(inject);
                  },
                }),
              ],
          m('span.inline', '.'),
        ])
      );
    },
  };
};

const Delay: FactoryComponent<{ inject: IInject; disabled?: boolean; onChange: (inject: IInject) => void }> = () => {
  return {
    view: ({ attrs: { inject, disabled = false, onChange } }) => {
      const { condition } = inject;
      return condition &&
        (condition.type === InjectConditionType.DELAY || condition.type === InjectConditionType.MANUALLY)
        ? [
            m(NumberInput, {
              disabled,
              className: 'inline xs',
              min: 0,
              initialValue: condition.delay,
              onchange: (v: number) => {
                inject.condition!.delay = v;
                onChange(inject);
              },
            }),
            m(Select, {
              disabled,
              placeholder: 'Pick one',
              className: 'inline small',
              checkedId: condition.delayUnitType,
              options: [
                { id: 'seconds', label: condition.delay === 1 ? 'second' : 'seconds' },
                { id: 'minutes', label: condition.delay === 1 ? 'minute' : 'minutes' },
                { id: 'hours', label: condition.delay === 1 ? 'hour' : 'hours' },
              ],
              onchange: (v) => {
                inject.condition!.delayUnitType = v[0] as 'seconds' | 'minutes' | 'hours' | undefined;
                onChange(inject);
              },
            }),
          ]
        : undefined;
    },
  };
};

const StartAt: FactoryComponent<{
  condition: IInjectCondition;
  inject: IInject;
  disabled?: boolean;
  onChange: (inject: IInject) => void;
}> = () => {
  return {
    view: ({ attrs: { condition, inject, disabled = false, onChange } }) => {
      const { delay = 0, delayUnitType = 'seconds' } = condition;
      const trial = TrialSvc.getCurrent();
      if (!trial) {
        return;
      }
      const scenario = getParent(trial.injects, inject.parentId) as IScenario;
      if (!scenario) {
        return;
      }
      const sec = delayUnitType === 'seconds' ? 1 : delayUnitType === 'minutes' ? 60 : 3600;
      const delayInSeconds = delay * sec;
      const trialStart = scenario.startDate ? new Date(scenario.startDate) : new Date();
      const atTime = new Date(trialStart.getTime() + delayInSeconds * 1000);
      return m(TimePicker, {
        disabled,
        className: 'inline',
        initialValue: `${padLeft(atTime.getHours(), 2)}:${padLeft(atTime.getMinutes(), 2)}`,
        prefix: 'Start',
        dt: atTime,
        onchange: (time: string) => {
          const regex = /(\d{1,2}):(\d{1,2})/g;
          const match = regex.exec(time);
          if (!match || match.length < 2) {
            return;
          }
          const hrs = +match[1];
          const min = +match[2];
          const newTime = new Date(new Date(atTime).setHours(hrs, min, 0)).getTime();
          const oldTime = trialStart.getTime();
          const dtInSec = (newTime - oldTime) / 1000;
          if (dtInSec < 0) {
            M.toast({ html: 'Cannot start before the scenario starts!', classes: 'red' });
            console.warn('Cannot start before the scenario starts!');
            return;
          }
          inject.condition!.delay = dtInSec;
          inject.condition!.delayUnitType = 'seconds';
          onChange(inject);
        },
      });
    },
  };
};
