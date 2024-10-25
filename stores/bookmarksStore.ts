import {defineStore} from 'pinia';
import _ from "lodash";
import {Bookmark} from "src/bookmarks/models/Bookmark";
import {TreeNode} from "src/bookmarks/models/Tree";
import {TreeNodeInfo} from "src/bookmarks/models/TreeNodeInfo";

function nodesFrom(
  parent: chrome.bookmarks.BookmarkTreeNode,
  allFoldersCount = 0,
  allBookmarksCount = 0,
  level: number = 0): TreeNodeInfo {

  const parentNode = new TreeNode(parent.id, parent.title, parent.title, parent.url, parent.url ? 'o_article' : 'o_folder', [], level,0, 0)

  level++
  let subNodes: TreeNode[] = []
  let foldersCount = 0
  let leavesCount = 0
  if (parent.children) {
    for (const c of parent.children) {
      //const [allNodes, fCount, bCount] = nodesFrom(c, allFoldersCount, allBookmarksCount, level)
      const treeNodeInfo: TreeNodeInfo = nodesFrom(c, allFoldersCount, allBookmarksCount, level)
      foldersCount += treeNodeInfo.folderCount
      leavesCount += treeNodeInfo.leafCount
      if (treeNodeInfo.treeNode && treeNodeInfo.treeNode.url) {
        leavesCount++
      } else {
        foldersCount++
      }
      if (treeNodeInfo.treeNode ) {
        subNodes.push(treeNodeInfo.treeNode )
      }
    }
  }
  parentNode.children = subNodes
  parentNode.subFoldersCount = foldersCount
  parentNode.subNodesCount = leavesCount
  // return [parentNode, allFoldersCount + foldersCount, allBookmarksCount + leavesCount]
  return new TreeNodeInfo (parentNode, allFoldersCount + foldersCount, allBookmarksCount + leavesCount)
}

function nodesWithoutLeaves(
  parent: TreeNode,
): TreeNode | undefined {

  // if (parent.getHeader() !== 'node' && parent.getHeader() !== 'root') {
  //   return undefined
  // }
  if (parent.url) {
    return undefined
  }
  if (parent.children) {
    const folderChildren: TreeNode[] = []
    for (const c of parent.children) {
      const childNodeWithoutLeaves = nodesWithoutLeaves(c)
      if (childNodeWithoutLeaves) {
        folderChildren.push(c)
      }
    }
    parent.children = folderChildren
  }

  return parent
}

export const useBookmarksStore = defineStore('bookmarks', {

  state: () => ({
    bookmarksTree: [] as unknown as object[],
    //bookmarksNodes: [] as unknown as object[],
    nonLeafNodes: [] as unknown as TreeNode[],
    bookmarksNodes2: [] as unknown as TreeNode[], // TODO which states to keep?
    bookmarksLeaves: [] as unknown as object[],

    currentFolder: null as unknown as chrome.bookmarks.BookmarkTreeNode,
    //currentBookmark: null as unknown as chrome.bookmarks.BookmarkTreeNode,
    currentBookmark: null as unknown as Bookmark,

    // the bookmarks (nodes and leaves) for the selected parent id
    bookmarksForFolder: null as unknown as Bookmark[],

    bookmarksCount: 0,
    foldersCount: 0
  }),

  getters: {
    findBookmarksForUrl: (state) => {
      return async (url: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
        const res = await chrome.bookmarks.search({url: url})
        return res
      }
    }
  },

  actions: {

    init() {
      console.debug(" ...initializing bookmarkStore",'✅')
      this.initListeners()
    },

    async loadBookmarks(): Promise<void> {
      //useUiStore().bookmarksLoading = true
      this.bookmarksTree = []
     // this.bookmarksNodes = []
      this.bookmarksNodes2 = []
      this.nonLeafNodes = []
      this.bookmarksLeaves = []
      //console.debug(" ...loading bookmarks")//, (new Error()).stack)
      // @ts-ignore
      const bookmarks: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.search({})//, async (bookmarks) => {
      this.bookmarksLeaves = bookmarks

      // @ts-ignore
      const tree: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.getTree()

      const tni:TreeNodeInfo = nodesFrom(tree[0])
      if (tni.treeNode) {
        this.bookmarksNodes2 = tni.treeNode.children
        let copy:TreeNode = (JSON.parse(JSON.stringify(tni.treeNode)));
        this.nonLeafNodes = nodesWithoutLeaves(copy)?.children || []
      }
      this.foldersCount = tni.folderCount
      this.bookmarksCount = tni.leafCount

      //useUiStore().bookmarksLoading = false
      return Promise.resolve()
    },

    remove(bm: Bookmark) {
      this.bookmarksForFolder = _.filter(this.bookmarksForFolder, (e: Bookmark) => e.id !== bm.id)
    },

    initListeners() {
      // moved to chromeBookmarkListeners
    },

    updateUrl(from: string, to: string) {
      chrome.bookmarks.search({url: from}, (results: chrome.bookmarks.BookmarkTreeNode[]) => {
        results.forEach((r: chrome.bookmarks.BookmarkTreeNode) => {
          chrome.bookmarks.update(r.id, {url: to}, updateResult => {
            console.log("updated bookmark", updateResult)
          })
        })
      })
    }

  }
});
