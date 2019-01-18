import m, { Component } from 'mithril';
import { TextInput } from 'mithril-materialized';
import { unflatten, titleAndDescriptionFilter } from '../../utils/utils';
import { TreeContainer, ITreeOptions, ITreeItem, ITreeItemViewComponent } from 'mithril-tree-component';
import { ScenarioSvc } from '../../services/scenario-service';
import { ISubscriptionDefinition } from '../../services/message-bus-service';
import { TopicNames, objectiveChannel } from '../../models/channels';
import { IObjective } from '../../models';

export const ObjectivesList = () => {
  const state = {
    selected: undefined as IObjective | undefined,
    filterValue: '',
    scenarioId: '' as string | undefined,
    subscription: {} as ISubscriptionDefinition<any>,
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
      ScenarioSvc.createObjective(ti as IObjective);
    },
    onCreate: ti => {
      console.log(`On create ${ti.title}`);
      // ScenarioSvc.createObjective(ti as IObjective);
    },
    onBeforeDelete: ti => console.log(`On before delete ${ti.title}`),
    onDelete: async ti => {
      console.log(`On delete ${ti.title}`);
      ScenarioSvc.deleteObjective(ti as IObjective);
    },
    onBeforeUpdate: (ti, action, newParent) =>
      console.log(`On before ${action} update ${ti.title} to ${newParent ? newParent.title : ''}.`),
    onUpdate: ti => {
      console.log(`On update ${ti.title}`);
      if (!ti.parentId) {
        ti.parentId = '';
      }
      ScenarioSvc.updateObjective(ti as IObjective);
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

  const objectiveSelected = (selected: IObjective, isSelected: boolean) => {
    state.selected = selected;
    objectiveChannel.publish(TopicNames.ITEM_SELECT, isSelected ? { cur: selected } : { cur: {} as IObjective });
  };

  return {
    oninit: () => {
      console.log('Oninit objectives-view called...');
      const loadObjectives = async () => {
        const scenario = ScenarioSvc.getCurrent();
        state.scenarioId = scenario.id;
      };
      state.subscription = objectiveChannel.subscribe(TopicNames.LIST, m.redraw);
      loadObjectives();
    },
    onbeforeremove: () => {
      state.subscription.unsubscribe();
    },
    view: () => {
      const query = titleAndDescriptionFilter(state.filterValue);
      const objectives = ScenarioSvc.getObjectives();
      const filteredObjectives = objectives && objectives.filter(query);
      // console.log(objectives.map(o => o.title).join('\n'));
      const tree = unflatten(filteredObjectives);
      // console.log('Objectives-list updated...');
      return m('.row.objectives-list', [
        m(
          '.col.s12',
          m(TextInput, {
            label: 'Filter',
            id: 'filter',
            iconName: 'filter_list',
            initialValue: state.filterValue,
            onchange: (v: string) => (state.filterValue = v),
            contentClass: 'right',
          })
        ),
        m('.col.s12', m(TreeContainer, { tree, options })),
      ]);
    },
  };
};
