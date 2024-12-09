<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <ImportFromBookmarksDialogBody
      @import-bookmarks="(a:any) => importBookmarks(a)"
      :in-side-panel="props.inSidePanel"
      :foldersCount="props.foldersCount"
      :bmId="props.bmId"
      :bmTitle="props.bmTitle"
      :count="props.count"/>
  </q-dialog>
</template>

<script lang="ts" setup>

import {useDialogPluginComponent, useQuasar} from "quasar";
import ImportFromBookmarksDialogBody from "src/bookmarks/dialogues/helper/ImportFromBookmarksDialogBody.vue";
import {useTabsetService} from "src/tabsets/services/TabsetService2";
import ChromeApi from "src/app/BrowserApi";
import {useUtils} from "src/core/services/Utils";
import {Tabset} from "src/tabsets/models/Tabset";
import _ from "lodash"

const $q = useQuasar()
const {sendMsg} = useUtils()

defineEmits([
  ...useDialogPluginComponent.emits
])

const props = defineProps({
  inSidePanel: {type: Boolean, default: false},
  count: {type: Number, default: 0},
  bmId: {type: Number, required: true},
  bmTitle: {type: String, required: true},
  foldersCount: {type: Number, default: 0}
})

const {dialogRef, onDialogHide, onDialogOK} = useDialogPluginComponent()

// TODO get rid of tabset-references here; use AppEventDispatcher
async function createTabsetFrom(name: string, bookmarkId: string): Promise<Tabset> {
  console.log("creating recursively", name, bookmarkId)
  const subTree: chrome.bookmarks.BookmarkTreeNode[] = await ChromeApi.childrenFor(bookmarkId)
  const folders = _.filter(subTree, (e: chrome.bookmarks.BookmarkTreeNode) => e.url === undefined)
  const nodes = _.filter(subTree, (e: chrome.bookmarks.BookmarkTreeNode) => e.url !== undefined)
  const subfolders: Tabset[] = []
  for (const f of folders) {
    console.log("found folder", f)
    const subTabset = await createTabsetFrom(f.title, f.id)
    subfolders.push(subTabset)
  }
  const result = await useTabsetService().saveOrReplaceFromBookmarks(name, nodes, true, true)
  console.log("result", result)
  const ts: Tabset = result['tabset' as keyof object]
  ts.folders = subfolders
  ts.bookmarkId = bookmarkId
  subfolders.forEach(f => f.folderParent = ts.id)
  return ts
}


const importBookmarks = async (a: { bmId: number, recursive: boolean, tsName: string }) => {
  // const bookmarkId = props.folderId //route.params.id as string
  console.log("importing bookmarks from", a)// bookmarkId.value, recursive.value)

  $q.loadingBar?.start()

  const tabset = await createTabsetFrom(a.tsName, "" + a.bmId)
  await useTabsetService().saveTabset(tabset)
  $q.loadingBar?.stop()

  sendMsg('reload-tabset', {tabsetId: tabset.id})
  sendMsg('sidepanel-switch-view', {view: 'main'})

  onDialogOK({tabsetId: tabset.id})
  return tabset

  // const candidates: chrome.bookmarks.BookmarkTreeNode[] = await ChromeApi.childrenFor("" + a.bmId)
  // useCommandExecutor()
  //   .executeFromUi(new CreateTabsetFromBookmarksCommand(a.tsName, candidates))
  //   .then((res: ExecutionResult<object>) => {
  //     sendMsg('reload-tabset', {tabsetId: res.result['tabsetId' as keyof object]})
  //     sendMsg('sidepanel-switch-view', {view: 'main'})
  //     return res
  //   })
  //   .then((res: ExecutionResult<object>) => {
  //     chrome.tabs.getCurrent().then(current => {
  //       if (current && current.id) {
  //         chrome.tabs.remove(current.id)
  //       }
  //     })
  //
  //     if (chrome.runtime.lastError) {
  //       console.warn("got runtime error", chrome.runtime.lastError)
  //     }
  //     onDialogOK(res.result)
  //   })
  //
  // $q.loadingBar?.stop()
}

</script>
