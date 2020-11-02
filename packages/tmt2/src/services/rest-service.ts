import m from 'mithril';
import { createPatch } from 'rfc6902';
import { SocketSvc } from '.';
import { IContent } from '../../../models/dist';
// import { createPatch, Operation } from 'rfc6902';
// import { SocketSvc } from './socket-service';

const log = console.log;
const error = console.error;

export interface IRestService<T extends IContent> {
  url: string;
  create: (item: Partial<T>, fd?: FormData | undefined) => Promise<void | T>;
  update: (item: Partial<T>, fd?: FormData | undefined) => Promise<void | T>;
  patch: (current: T, old: T) => Promise<void>;
  save: (item: Partial<T>, fd?: FormData | undefined) => Promise<void | T>;
  del: (id: string | number) => Promise<void>;
  load: (id: string | number) => Promise<T>;
  loadList: (props?: string[]) => Promise<T[]>;
  loadFilteredList: (props?: string[]) => Promise<T[]>;
}

const createRestServiceFactory = (apiService: string) => {
  return <T extends IContent>(urlFragment: string) => {
    console.log(apiService);
    const url = `${apiService}/${urlFragment}/`;
    const withCredentials = false;

    const create = async (item: Partial<T>, fd?: FormData) => {
      try {
        return await m.request<T>({
          method: 'POST',
          url,
          body: fd || item,
          withCredentials,
        });
      } catch (err) {
        return error(err.message);
      }
    };

    const update = async (item: Partial<T>, fd?: FormData) => {
      try {
        console.debug('put');
        return await m
          .request<T>({
            method: 'PUT',
            url: url + item.id,
            body: fd || item,
            withCredentials,
          })
          .catch((e) => console.error(e));
      } catch (err) {
        return error(err.message);
      }
    };

    const save = (item: Partial<T>, fd?: FormData) => (item.id ? update(item, fd) : create(item, fd));

    const patch = (current: T, old: T) => {
      try {
        // console.log('Patch at ' + new Date());
        const patch = createPatch(old, current);
        if (patch.length === 0) {
          return;
        }
        // console.log(JSON.stringify(patch, null, 2));
        m.request<T>({
          method: 'PATCH',
          url: url + current.id,
          body: { id: SocketSvc.socket.id, patch },
          withCredentials,
        }).catch((e) => console.error(e));
      } catch (err) {
        error(err.message);
      }
    };

    const del = async (id: string | number) => {
      try {
        await m.request<T>({
          method: 'DELETE',
          url: url + id,
          withCredentials,
        });
        log(`Deleted with id: ${id}.`);
      } catch (err) {
        return error(err.message);
      }
    };

    const load = (id?: string | number) =>
      m.request<T>({
        method: 'GET',
        url: url + id,
        withCredentials,
      });

    const loadList = async () => {
      const result = await m.request<T[]>({
        method: 'GET',
        url,
        withCredentials,
      });
      if (!result) {
        console.warn(`No result found at ${url}`);
      }
      return result;
    };

    const loadFilteredList = async (props: string[] = ['id', 'title', 'author', 'desc', 'img']) => {
      const filter = 'view?props=' + props.join(',');
      const result = await m.request<T[]>({
        method: 'GET',
        url: url + filter,
        withCredentials,
      });
      if (!result) {
        console.warn(`No result found at ${url}`);
      }
      return result;
    };

    return {
      url,
      create,
      update,
      patch,
      save,
      del,
      load,
      loadList,
      loadFilteredList,
    } as IRestService<T>;
  };
};

export const restServiceFactory = createRestServiceFactory(process.env.SERVER || location.origin);
