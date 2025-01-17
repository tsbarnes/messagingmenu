/**
 * Messaging Menu - A Messaging Menu for the Gnome Shell
 * Copyright (C) 2012 Andreas Wilhelm
 * See LICENSE.txt for details
 */

const GObject = imports.gi.GObject;

const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const MessageTray = imports.ui.messageTray;

const Gettext = imports.gettext.domain("messagingmenu");
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const ICON_SIZE = 22;

let compatible_Chats = [
  "amsn",
  "caprine",
  "im.dino.Dino",
  "emesene",
  "empathy",
  "fedora-empathy",
  "gajim",
  "hexchat",
  "io.github.qtox.qTox.desktop",
  "kadu",
  "kde4-kmess",
  "kde4-konversation",
  "kde4-kopete",
  "openfetion",
  "org.gnome.Fractal",
  "org.gnome.Polari",
  "pidgin",
  "qtox",
  "qutim",
  "signal-desktop",
  "skype",
  "skypeforlinux",
  "slack",
  "telegramdesktop",
  "utox",
  "venom",
  "viber",
  "xchat",
  "discord",
];

let compatible_MBlogs = [
  "birdie",
  "corebird",
  "fedora-gwibber",
  "friends-app",
  "gfeedline",
  "gtwitter",
  "gwibber",
  "heybuddy",
  "hotot",
  "mitter",
  "org.baedert.corebird",
  "pino",
  "polly",
  "qwit",
  "turpial",
  "twitux",
  "uk.co.ibboard.cawbird",
  "com.github.bleakgrey.tootle",
];

let compatible_Emails = [
  "claws-mail",
  "evolution",
  "geary",
  "gnome-gmail",
  "icedove",
  "kde4-KMail2",
  "mozilla-thunderbird",
  "org.gnome.Evolution",
  "org.gnome.Geary",
  "postler",
  "thunderbird",
];

// Must be their Notificationtitle, because lookup_app doesnt work here
let compatible_hidden_Email_Notifiers = [
  "gmail-notify",
  "mail-notification",
  "Mailnag",
  "Thunderbird",
];

let compatible_hidden_MBlog_Notifiers = ["friends", "GFeedLine", "gwibber"];

const MessageMenuItem = GObject.registerClass(
  class MessageMenu_MessageMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(app) {
      super._init();
      this._app = app;

      this.label = new St.Label({
        text: app.get_name(),
        style_class: "program-label",
      });
      this.add_child(this.label);

      this._icon = app.create_icon_texture(ICON_SIZE);
      this.add_child(this._icon);
    }

    activate(event) {
      this._app.activate_full(-1, event.get_time());
      super.activate(event);
    }
  }
);

const MessageMenu = GObject.registerClass(
  class MessageMenu_MessageMenu extends PanelMenu.Button {
    _init() {
      super._init(0.0, "MessageMenu");
      let hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      let icon = new St.Icon({
        icon_name: "mail-message-new-symbolic",
        style_class: "system-status-icon",
      });

      hbox.add_child(icon);
      this.add_child(hbox);

      this.new_msg_string = _("Compose New Message");
      this.contacts_string = _("Contacts");

      this._availableEmails = new Array();
      this._availableChats = new Array();
      this._availableMBlogs = new Array();

      this._thunderbird = null;
      this._icedove = null;
      this._kmail = null;
      this._claws = null;
      this._evolution = null;
      this._geary = null;

      this._getApps();
      this._buildMenu();
    }

    _buildMenu() {
      // insert Email Clients into menu

      // Special Evolution Menu Entry
      if (this._evolution != null) {
        let newLauncher = new MessageMenuItem(this._evolution);
        this.menu.addMenuItem(newLauncher);

        this.comp = new PopupMenu.PopupMenuItem(this.new_msg_string + "...", {
          style_class: "special-action",
        });
        this.con = new PopupMenu.PopupMenuItem(this.contacts_string, {
          style_class: "special-action",
        });

        this.con.connect("activate", this._evolutionContacts.bind(this));
        this.comp.connect("activate", this._evolutionCompose.bind(this));
        this.menu.addMenuItem(this.comp);
        this.menu.addMenuItem(this.con);
      }

      // Special Thunderbird Menu Entry
      if (this._thunderbird != null) {
        let newLauncher = new MessageMenuItem(this._thunderbird);
        this.menu.addMenuItem(newLauncher);

        this.comp_tb = new PopupMenu.PopupMenuItem(
          this.new_msg_string + "...",
          { style_class: "special-action" }
        );
        this.con_tb = new PopupMenu.PopupMenuItem(this.contacts_string, {
          style_class: "special-action",
        });

        this.comp_tb.connect("activate", this._TbCompose.bind(this));
        this.menu.addMenuItem(this.comp_tb);

        this.con_tb.connect("activate", this._TbContacts.bind(this));
        this.menu.addMenuItem(this.con_tb);
      }

      // Special Icedove Menu Entry
      if (this._icedove != null) {
        let newLauncher = new MessageMenuItem(this._icedove);
        this.menu.addMenuItem(newLauncher);

        this.comp_icedove = new PopupMenu.PopupMenuItem(
          this.new_msg_string + "...",
          { style_class: "special-action" }
        );
        this.con_icedove = new PopupMenu.PopupMenuItem(this.contacts_string, {
          style_class: "special-action",
        });

        this.comp_icedove.connect("activate", this._icedoveCompose.bind(this));
        this.menu.addMenuItem(this.comp_icedove);

        this.con_icedove.connect("activate", this._icedoveContacts.bind(this));
        this.menu.addMenuItem(this.con_icedove);
      }

      // Special Kmail Menu Entry
      if (this._kmail != null) {
        let newLauncher = new MessageMenuItem(this._kmail);
        this.menu.addMenuItem(newLauncher);

        this.comp = new PopupMenu.PopupMenuItem(this.new_msg_string + "...", {
          style_class: "special-action",
        });

        this.comp.connect("activate", this._kmailCompose.bind(this));
        this.menu.addMenuItem(this.comp);
      }

      // Special Claws Menu Entry
      if (this._claws != null) {
        let newLauncher = new MessageMenuItem(this._claws);
        this.menu.addMenuItem(newLauncher);

        this.comp = new PopupMenu.PopupMenuItem(this.new_msg_string + "...", {
          style_class: "special-action",
        });

        this.comp.connect("activate", this._clawsCompose.bind(this));
        this.menu.addMenuItem(this.comp);
      }

      // Special Geary Menu Entry
      if (this._geary != null) {
        let newLauncher = new MessageMenuItem(this._geary);
        this.menu.addMenuItem(newLauncher);

        this.comp = new PopupMenu.PopupMenuItem(this.new_msg_string + "...", {
          style_class: "special-action",
        });

        this.comp.connect("activate", this._gearyCompose.bind(this));
        this.menu.addMenuItem(this.comp);
      }

      for (var t = 0; t < this._availableEmails.length; t++) {
        let e_app = this._availableEmails[t];
        let newLauncher = new MessageMenuItem(e_app);
        this.menu.addMenuItem(newLauncher);
      }
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // insert Chat Clients into menu
      for (var k = 0; k < this._availableChats.length; k++) {
        let newLauncher = new MessageMenuItem(this._availableChats[k]);
        this.menu.addMenuItem(newLauncher);
      }
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // insert Blogging Clients into menu
      for (var l = 0; l < this._availableMBlogs.length; l++) {
        let newLauncher = new MessageMenuItem(this._availableMBlogs[l]);
        this.menu.addMenuItem(newLauncher);
      }
    }

    _getApps() {
      let appsys = Shell.AppSystem.get_default();
      //get available Email Apps
      for (var p = 0; p < compatible_Emails.length; p++) {
        let app_name = compatible_Emails[p];
        let app = appsys.lookup_app(app_name + ".desktop");

        if (app != null) {
          // filter Apps with special Menus
          if (app_name == "thunderbird" || app_name == "mozilla-thunderbird") {
            this._thunderbird = app;
          } else if (app_name == "icedove") {
            this._icedove = app;
          } else if (app_name == "KMail2") {
            this._kmail = app;
          } else if (app_name == "claws-mail") {
            this._claws = app;
          } else if (
            app_name == "evolution" ||
            app_name == "org.gnome.Evolution"
          ) {
            this._evolution = app;
          } else if (app_name == "geary" || app_name == "org.gnome.Geary") {
            this._geary = app;
          } else {
            this._availableEmails.push(app);
          }
          if (settings.get_boolean("notify-email")) {
            availableNotifiers.push(app);
          }
        }
      }
      //get available Chat Apps
      for (var o = 0; o < compatible_Chats.length; o++) {
        let app_name = compatible_Chats[o];
        let app = appsys.lookup_app(app_name + ".desktop");

        if (app != null) {
          this._availableChats.push(app);
          if (settings.get_boolean("notify-chat")) {
            availableNotifiers.push(app);
          }
        }
      }
      //get available Blogging Apps
      for (var u = 0; u < compatible_MBlogs.length; u++) {
        let app_name = compatible_MBlogs[u];
        let app = appsys.lookup_app(app_name + ".desktop");

        if (app != null) {
          this._availableMBlogs.push(app);
          if (settings.get_boolean("notify-mblogging")) {
            availableNotifiers.push(app);
          }
        }
      }
    }

    _TbCompose() {
      Util.trySpawnCommandLine("thunderbird -compose");
    }

    _TbContacts() {
      Util.trySpawnCommandLine("thunderbird -addressbook");
    }

    _icedoveCompose() {
      Util.trySpawnCommandLine("icedove -compose");
    }

    _icedoveContacts() {
      Util.trySpawnCommandLine("icedove -addressbook");
    }

    _kmailCompose() {
      Util.trySpawnCommandLine("kmail -compose");
    }

    _clawsCompose() {
      Util.trySpawnCommandLine("claws-mail --compose");
    }

    _evolutionCompose() {
      Util.trySpawnCommandLine("evolution mailto:");
    }

    _evolutionContacts() {
      Util.trySpawnCommandLine("evolution -c contacts");
    }

    _gearyCompose() {
      Util.trySpawnCommandLine("geary mailto:user@example.com");
    }

    destroy() {
      super.destroy();
    }
  }
);

function _updateMessageStatus() {
  // get all Messages
  let items;

  try {
    items = Main.messageTray.getSummaryItems();
  } catch (e) {
    // GS 3.8 Support
    items = Main.messageTray.getSources();
  }

  let newMessage = false;
  for (let i = 0; i < items.length; i++) {
    let source;
    if (items[i].source != undefined) {
      source = items[i].source;
    } else {
      source = items[i];
    } // GS 3.8

    // check for new Chat Messages
    if (
      settings.get_boolean("notify-chat") &&
      source.isChat &&
      !source.isMuted &&
      unseenMessageCheck(source)
    ) {
      newMessage = true;
    } else if (source.app != null) {
      // check for Message from known Email App
      for (let j = 0; j < availableNotifiers.length; j++) {
        let app_id = availableNotifiers[j].get_id(); //e.g. thunderbird.desktop
        if (source.app.get_id() == app_id && unseenMessageCheck(source)) {
          newMessage = true;
        }
      }
    } else {
      for (let k = 0; k < availableNotifiers.length; k++) {
        let app_name = availableNotifiers[k].get_name(); //e.g. Thunderbird Mail
        if (source.title == app_name && unseenMessageCheck(source)) {
          newMessage = true;
        }
      }
      if (settings.get_boolean("notify-email")) {
        for (let l = 0; l < compatible_hidden_Email_Notifiers.length; l++) {
          let app_name = compatible_hidden_Email_Notifiers[l]; //e.g. Mailnag
          if (source.title == app_name && unseenMessageCheck(source)) {
            newMessage = true;
          }
        }
      }

      if (settings.get_boolean("notify-mblogging")) {
        for (let m = 0; m < compatible_hidden_MBlog_Notifiers.length; m++) {
          let app_name = compatible_hidden_MBlog_Notifiers[m]; //e.g. friends
          if (source.title == app_name && unseenMessageCheck(source)) {
            newMessage = true;
          }
        }
      }
    }
  }

  // Change Status Icon in Panel
  if (newMessage && !iconChanged) {
    //let messMenu = statusArea.messageMenu;
    let color = settings.get_string("color");
    let style = "color: " + color;
    iconBox.set_style(style);
    iconChanged = true;
  } else if (!newMessage && iconChanged) {
    //let messMenu = statusArea.messageMenu;
    iconBox.set_style(originalStyle);
    iconChanged = false;
  }
}

function unseenMessageCheck(source) {
  let unseen = false;
  if (source.unseenCount == undefined) {
    unseen =
      source._counterBin.visible && source._counterLabel.get_text() != "0";
  } else {
    unseen = source.unseenCount > 0;
  }

  return unseen;
}

function customUpdateCount() {
  originalUpdateCount.call(this);
  try {
    _updateMessageStatus();
  } catch (err) {
    /* If the extension is broken I don't want to break everything.
     * We just catch the extension, print it and go on */
    logError(err, err);
  }
}

function init(extensionMeta) {
  ExtensionUtils.initTranslations("messagingmenu");
  //	let theme = imports.gi.Gtk.IconTheme.get_default();
  //	theme.append_search_path(extensionMeta.path + "/icons");
}

let _indicator;
let originalUpdateCount;
let originalStyle;
let iconChanged = false;
let availableNotifiers = new Array();
let statusArea;
let iconBox;

function enable() {
  this.settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.messagingmenu"
  );
  _indicator = new MessageMenu();

  originalUpdateCount = MessageTray.SourceActor.prototype._updateCount;
  MessageTray.SourceActor.prototype._updateCount = customUpdateCount;

  statusArea = Main.panel.statusArea;

  Main.panel.addToStatusArea("messageMenu", _indicator, 1);

  iconBox = statusArea.messageMenu;

  originalStyle = iconBox.get_style();
}

function disable() {
  MessageTray.SourceActor.prototype._updateCount = originalUpdateCount;
  _indicator.destroy();
  _indicator = null;
  this.settings = null;
}
