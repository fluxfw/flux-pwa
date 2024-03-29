import { SETTINGS_STORAGE_KEY_INSTALL_CONFIRM_SHOWN } from "../SettingsStorage/SETTINGS_STORAGE_KEY.mjs";

/** @typedef {import("../SettingsStorage/SettingsStorage.mjs").SettingsStorage} SettingsStorage */
/** @typedef {import("./_showInstallConfirm.mjs").showInstallConfirm} showInstallConfirm */

export class InitInstallConfirm {
    /**
     * @type {(() => void) | null}
     */
    #hide_install_confirm = null;
    /**
     * @type {SettingsStorage}
     */
    #settings_storage;
    /**
     * @type {(() => Promise<void>) | null}
     */
    #show_install_confirm = null;
    /**
     * @type {boolean | null}
     */
    #show_install_confirm_later = null;

    /**
     * @param {SettingsStorage} settings_storage
     * @returns {Promise<InitInstallConfirm>}
     */
    static async new(settings_storage) {
        return new this(
            settings_storage
        );
    }

    /**
     * @param {SettingsStorage} settings_storage
     * @private
     */
    constructor(settings_storage) {
        this.#settings_storage = settings_storage;
    }

    /**
     * @param {showInstallConfirm} show_install_confirm
     * @param {boolean | null} show_install_confirm_later
     * @returns {Promise<void>}
     */
    async initInstallConfirm(show_install_confirm, show_install_confirm_later = null) {
        if (!("onbeforeinstallprompt" in globalThis)) {
            return;
        }

        this.#show_install_confirm_later = show_install_confirm_later ?? false;

        addEventListener("beforeinstallprompt", async e => {
            e.preventDefault();

            this.#show_install_confirm = async () => {
                this.#hideInstallConfirm();

                if (this.#show_install_confirm_later || await this.#isInstallConfirmShown()) {
                    return;
                }

                this.#show_install_confirm = null;

                const install = await show_install_confirm(
                    hide_confirm => {
                        this.#hide_install_confirm = () => {
                            this.#hide_install_confirm = null;
                            hide_confirm();
                        };
                    }
                );

                this.#hide_install_confirm = null;

                if (install === null) {
                    this.#show_install_confirm_later = true;
                    return;
                }

                await this.#setInstallConfirmShown();

                if (!install) {
                    return;
                }

                await e.prompt();
            };

            await this.#show_install_confirm();
        });

        if (await this.#isInstallConfirmShown()) {
            return;
        }

        const pwa_installed_detector = matchMedia("(display-mode:browser)");

        if (!pwa_installed_detector.matches) {
            await this.#setInstallConfirmShown();
            return;
        }

        pwa_installed_detector.addEventListener("change", async () => {
            await this.#setInstallConfirmShown();

            this.#hideInstallConfirm();
        }, {
            once: true
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async showLaterInstallConfirm() {
        if (!(this.#show_install_confirm_later ?? false)) {
            return;
        }

        this.#show_install_confirm_later = false;

        if (this.#show_install_confirm !== null) {
            await this.#show_install_confirm();
        }
    }

    /**
     * @returns {void}
     */
    #hideInstallConfirm() {
        if (this.#hide_install_confirm !== null) {
            this.#hide_install_confirm();
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async #isInstallConfirmShown() {
        return this.#settings_storage.get(
            SETTINGS_STORAGE_KEY_INSTALL_CONFIRM_SHOWN,
            false
        );
    }

    /**
     * @returns {Promise<void>}
     */
    async #setInstallConfirmShown() {
        await this.#settings_storage.store(
            SETTINGS_STORAGE_KEY_INSTALL_CONFIRM_SHOWN,
            true
        );
    }
}
