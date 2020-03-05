import m, { FactoryComponent } from 'mithril';
import { TextArea, TextInput } from 'mithril-materialized';
import { getMessage, IInject, MessageType, IRequestTransport, InjectKeys } from 'trial-manager-models';
import { LeafletMap } from 'mithril-leaflet';
import { LineString, FeatureCollection } from 'geojson';
import { FeatureGroup, GeoJSON } from 'leaflet';
import { AppState } from '../../models';
import { centerArea, routeToGeoJSON, geoJSONtoRoute } from '../../utils';
import { TrialSvc } from '../../services';

export const RequestUnitTransportForm: FactoryComponent<{
  inject: IInject;
  disabled?: boolean;
  onChange?: (inject: IInject, prop: InjectKeys) => void;
}> = () => {
  const state = {} as {
    overlays?: { [key: string]: GeoJSON },
  };

  const setTitle = async (inject: IInject, si: IRequestTransport) => {
    const newTitle = `Send ${si.id} (${si.entity}) to ${si.destination}`;
    TrialSvc.overlayRename(inject.title, newTitle);
    state.overlays = await TrialSvc.overlays();
    inject.title = newTitle;
    m.redraw();
  };

  return {
    oninit: async ({ attrs: { inject } }) => {
      const ut = getMessage(inject, MessageType.REQUEST_UNIT_TRANSPORT) as IRequestTransport;
      ut.applicant = AppState.owner;
      state.overlays = await TrialSvc.overlays();
      m.redraw();
    },
    view: ({ attrs: { inject, disabled, onChange } }) => {
      const { overlays } = state;
      const ut = getMessage(inject, MessageType.REQUEST_UNIT_TRANSPORT) as IRequestTransport;
      const update = (prop: keyof IInject | Array<keyof IInject> = 'message') => onChange && onChange(inject, prop);

      const route = routeToGeoJSON(ut.route);
      const { view, zoom } = centerArea(route);

      return [
        m(TextInput, {
          disabled,
          className: 'col s6 m4',
          label: 'Unit ID',
          iconName: 'title',
          isMandatory: true,
          helperText: 'Name of the unit that must be transported.',
          initialValue: ut.entity,
          onchange: v => {
            ut.entity = v;
            setTitle(inject, ut);
            update(['title', 'message']);
          },
        }),
        m(TextInput, {
          disabled,
          className: 'col s6 m4',
          label: 'Unit Type',
          iconName: 'directions_car',
          isMandatory: false,
          // ('DEFAULT_BIKETYPE', 'DEFAULT_PEDTYPE', 'DEFAULT_VEHTYPE', 'bike_bicycle', 'bus_bus', 'emergency',
          // 'ped_pedestrian', 'rail_rail', 'tram_tram', 'truck_truck', 'veh_passenger')
          helperText: 'Unit type, e.g. emergency, bus_bus, truck_truck, tram_tram, veh_passenger or bike_bicycle.',
          initialValue: ut.tags && ut.tags.hasOwnProperty('unit') ? ut.tags.unit : undefined,
          onchange: v => {
            if (!ut.tags) {
              ut.tags = {};
            }
            ut.tags.unit = v;
            setTitle(inject, ut);
            update(['title', 'message']);
          },
        }),
        m(TextInput, {
          disabled,
          className: 'col s6 m4',
          label: 'Destination',
          iconName: 'store',
          isMandatory: true,
          helperText: 'Name of the station where you want to go.',
          initialValue: ut.destination,
          onchange: v => {
            ut.destination = v;
            setTitle(inject, ut);
            update(['title', 'message']);
          },
        }),
        m(LeafletMap, {
          style: 'width: 100%; height: 400px; margin-top: 10px;',
          view,
          zoom,
          overlays,
          visible: [inject.title],
          editable: [inject.title],
          // onMapClicked: console.log,
          showScale: { imperial: false },
          onLayerEdited: (f: FeatureGroup) => {
            const geojson = f.toGeoJSON() as FeatureCollection<LineString>;
            console.log('onLayerEdited');
            const r = geoJSONtoRoute(geojson);
            if (r) {
              ut.route = r;
              update();
            }
          },
        }),
        m(TextArea, {
          disabled,
          id: 'desc',
          initialValue: inject.description,
          onchange: (v: string) => (inject.description = v),
          label: 'Description',
          iconName: 'description',
        }),
      ];
    },
  };
};
