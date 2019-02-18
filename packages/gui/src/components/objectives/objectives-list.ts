import m, { Component } from 'mithril';
import { TextInput, Collection, ICollectionItem } from 'mithril-materialized';
import { titleAndDescriptionFilter } from '../../utils';
import { TreeContainer, ITreeOptions, ITreeItem, ITreeItemViewComponent } from 'mithril-tree-component';
import { TrialSvc } from '../../services';
import { IObjective } from 'trial-manager-models';
import { TopicNames, objectiveChannel } from '../../models';

export const ObjectivesList = () => {
  const state = {
    selected: undefined as IObjective | undefined,
    filterValue: '' as string | undefined,
    trialId: '' as string | undefined,
    objectives: undefined as IObjective[] | undefined,
    subscription: objectiveChannel.subscribe(TopicNames.LIST, m.redraw),
  };

  const options = {
    id: 'id',
    parentId: 'parentId',
    name: 'title',
    treeItemView: {
      view: ({ attrs }) => {
        return attrs.treeItem.title;
      },
    } as Component<ITreeItemViewComponent>,
    onSelect: (ti, isSelected) => objectiveSelected(ti as IObjective, isSelected),
    onBeforeCreate: ti => {
      console.log(`On before create ${ti.title}`);
      TrialSvc.createObjective(ti as IObjective);
    },
    onCreate: ti => {
      console.log(`On create ${ti.title}`);
      objectiveChannel.publish(TopicNames.ITEM_SELECT, { cur: ti as IObjective });
      // ScenarioSvc.createObjective(ti as IObjective);
    },
    onBeforeDelete: ti => console.log(`On before delete ${ti.title}`),
    onDelete: async ti => {
      console.log(`On delete ${ti.title}`);
      TrialSvc.deleteObjective(ti as IObjective);
    },
    onBeforeUpdate: (ti, action, newParent) =>
      console.log(`On before ${action} update ${ti.title} to ${newParent ? newParent.title : ''}.`),
    onUpdate: (ti, action) => {
      console.log(`On update ${ti.title}`);
      if (!ti.parentId) {
        ti.parentId = '';
      }
      if (action === 'edit') {
        TrialSvc.updateObjective(ti as IObjective);
      } else {
        TrialSvc.setObjectives(state.objectives);
        TrialSvc.saveTrial();
      }
    },
    create: (parent?: IObjective) => {
      const item = {
        id: '',
        parentId: parent ? parent.id : undefined,
        title: 'New objective',
      } as IObjective;
      return item as ITreeItem;
    },
    maxDepth: 1,
    editable: { canCreate: true, canDelete: true, canUpdate: true, canDeleteParent: false },
  } as ITreeOptions;

  const objectiveSelected = (selected?: IObjective, isSelected?: boolean) => {
    if (!selected) { return; }
    state.selected = selected;
    objectiveChannel.publish(TopicNames.ITEM_SELECT, isSelected ? { cur: selected } : { cur: {} as IObjective });
  };

  return {
    oninit: () => {
      console.log('Oninit objectives-view called...');
      const loadObjectives = async () => {
        const trial = TrialSvc.getCurrent();
        state.trialId = trial.id;
      };
      state.subscription = objectiveChannel.subscribe(TopicNames.LIST, m.redraw);
      loadObjectives();
    },
    onbeforeremove: () => {
      state.subscription.unsubscribe();
    },
    view: () => {
      const query = titleAndDescriptionFilter(state.filterValue);
      const objectives = TrialSvc.getObjectives();
      if (!state.selected && objectives && objectives.length > 0) {
        setTimeout(() => {
          objectiveSelected(objectives.filter(o => !o.parentId).shift(), true);
          m.redraw();
        }, 0);
      }
      const selectedObjectives = objectives && objectives.filter(query);
      state.objectives = selectedObjectives;
      return selectedObjectives
        ? m('.row.objectives-list', [
            m(
              '.col.s12',
              m(TextInput, {
                label: 'Filter',
                id: 'filter',
                iconName: 'filter_list',
                initialValue: state.filterValue,
                onkeyup: (ev: KeyboardEvent, v?: string) => (state.filterValue = v),
                contentClass: 'right',
              })
            ),
            m(
              '.col.s12',
              state.filterValue
                ? m(Collection, {
                    items: selectedObjectives.map(cur => ({
                      title: cur.title,
                      content: cur.description,
                      iconName: 'my_location',
                      onclick: (i: ICollectionItem) => objectiveChannel.publish(TopicNames.ITEM_SELECT, { cur }),
                    })),
                  })
                : m(TreeContainer, { tree: selectedObjectives, options })
            ),
          ])
        : undefined;
    },
  };
};
