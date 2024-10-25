import {TreeNode} from "src/bookmarks/models/Tree";

export class TreeNodeInfo {
  constructor(
    public treeNode?:TreeNode,
    public folderCount: number,
    public leafCount: number ) {
  }
}
