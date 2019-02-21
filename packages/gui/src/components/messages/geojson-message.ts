import m, { FactoryComponent } from 'mithril';
import { TextArea, TextInput, Select, FileInput } from 'mithril-materialized';
import { IInject, MessageType, IGeoJsonMessage } from 'trial-manager-models';
import { getMessage, eatSpaces, getMessageSubjects } from '../../utils';
import { TrialSvc } from '../../services';
import { IAsset } from 'trial-manager-models';

export const GeoJsonMessageForm: FactoryComponent<{ inject: IInject }> = () => {
  const jsonExt = /json$/i;
  const uploadAsset = async (files: FileList, pm: IGeoJsonMessage) => {
    const { alias } = pm;
    if (!files || files.length === 0 || !alias) {
      return;
    }
    const asset = { alias } as IAsset;
    const result = await TrialSvc.saveAsset(asset, files);
    if (result) {
      pm.assetId = result.id;
    }
  };

  return {
    view: ({ attrs: { inject } }) => {
      const pm = getMessage(inject, MessageType.GEOJSON_MESSAGE) as IGeoJsonMessage;
      const subjects = getMessageSubjects(MessageType.GEOJSON_MESSAGE);
      if (!pm.subjectId && subjects.length === 1) {
        pm.subjectId = subjects[0].id;
      }
      const assets = TrialSvc.assets;
      const options = assets
        .filter(a => a.mimetype === 'application/json' || jsonExt.test(a.filename))
        .map(a => ({ id: a.id, label: a.alias || a.filename }));

      return [
        m('.row', [
          m(
            '.col.s12.m6',
            m(TextInput, {
              id: 'title',
              initialValue: inject.title,
              onchange: (v: string) => {
                inject.title = v;
              },
              label: 'Title',
              iconName: 'title',
            })
          ),
          m('.col.s12.m6', m(Select, {
            placeholder: subjects.length === 0 ? 'First create a subject' : 'Select a subject',
            label: 'Subject',
            isMandatory: true,
            options: subjects,
            checkedId: pm.subjectId,
            onchange: (v: unknown) => (pm.subjectId = v as string),
          })),
        ]),
        m(TextArea, {
          id: 'desc',
          initialValue: inject.description,
          onchange: (v: string) => (inject.description = v),
          label: 'Description',
          iconName: 'short_text',
        }),
        m(Select, {
          iconName: 'file',
          placeholder: 'Select a geojson file',
          checkedId: pm.assetId,
          options,
          onchange: (v: unknown) => {
            const assetId = +(v as number);
            pm.assetId = assetId;
            const asset = assets.filter(a => a.id === assetId).shift();
            pm.alias = asset ? asset.alias : undefined;
          },
        }),
        m('h5', 'Upload a new GeoJSON file'),
        m(TextInput, {
          id: 'alias',
          initialValue: pm.alias,
          onkeydown: eatSpaces,
          onchange: (v: string) => {
            pm.alias = v;
          },
          label: 'Alias',
          placeholder: 'No spaces allowed',
          iconName: 'title',
          contentClass: 'col s12 m6',
        }),
        m(FileInput, {
          disabled: !pm.alias,
          placeholder: 'Upload a new GeoJSON file',
          onchange: (files: FileList) => uploadAsset(files, pm),
          accept: ['.json', '.geojson'],
          class: 'col s12 m6',
        }),
      ];
    },
  };
};
