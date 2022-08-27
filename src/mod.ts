import { DependencyContainer } from "tsyringe";

// SPT types
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { PreAkiModLoader } from "@spt-aki/loaders/PreAkiModLoader";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ImageRouter } from "@spt-aki/routers/ImageRouter";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { ITraderAssort, ITraderBase } from "@spt-aki/models/eft/common/tables/ITrader";
import { ITraderConfig, UpdateTime } from "@spt-aki/models/spt/config/ITraderConfig";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { ILocaleGlobalBase } from "@spt-aki/models/spt/server/ILocaleBase";

// The new trader config
import * as baseJson from "../db/base.json";

class SampleTrader implements IPreAkiLoadMod, IPostDBLoadMod
{
    mod: string

    constructor()
    {
        this.mod = "Questor-Reboot";
    }

    public preAkiLoad(container: DependencyContainer): void
    {
        this.registerProfileImage(container);
        
        this.setupTraderUpdateTime(container);
    }
    // DONE
    
    public postDBLoad(container: DependencyContainer): void
    {

        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const jsonUtil = container.resolve<JsonUtil>("JsonUtil");

        // Keep a reference to the tables
        const tables = databaseServer.getTables();

        // Add the new trader to the trader lists in DatabaseServer
        tables.traders[baseJson._id] = {
            assort: this.createAssortTable(container),
            base: jsonUtil.deserialize(jsonUtil.serialize(baseJson)) as ITraderBase,
            questassort: undefined
        };

        // For each language, add locale for the new trader
        const locales = Object.values(tables.locales.global) as ILocaleGlobalBase[];
        for (const locale of locales)
        {
            locale.trading[baseJson._id] = {
                FullName: "***Redacted***",
                FirstName: "***Redacted***",
                Nickname: baseJson.nickname,
                Location: baseJson.location,
                Description: "Sells Quest Items"
            };
        }
    }

    private registerProfileImage(container: DependencyContainer): void
    {
        // Reference the mod "res" folder
        const preAkiModLoader = container.resolve<PreAkiModLoader>("PreAkiModLoader");
        const imageFilepath = `./${preAkiModLoader.getModPath(this.mod)}res`;

        // Register route pointing to the profile picture
        const imageRouter = container.resolve<ImageRouter>("ImageRouter");
        imageRouter.addRoute(baseJson.avatar.replace(".png", ""), `${imageFilepath}/questor.png`);
    }

    private setupTraderUpdateTime(container: DependencyContainer): void
    {
        // Add refresh time in seconds when Config server allows to set configs
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const traderRefreshConfig: UpdateTime = { traderId: baseJson._id, seconds: 3600 }
        traderConfig.updateTime.push(traderRefreshConfig);
    }

    private createAssortTable(container: DependencyContainer): ITraderAssort 
    {
        // Assort table
        const assortTable: ITraderAssort = {
            nextResupply: 0,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        }
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer"); // Item Database Server
        const items = databaseServer.getTables().templates.items; // Database Server
        const questItems = Object.values(items).filter((item) => item._props.QuestItem);

        questItems.forEach((item) =>
        {
            assortTable.items.push({
                _id: item._name,
                _tpl: item._id,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    UnlimitedCount: true,
                    StackObjectsCount: 1000
                }
            });
            assortTable.barter_scheme[item._name] = [
                [{ count: 10000, _tpl: "5449016a4bdc2d6f028b456f" }]
            ];
            assortTable.loyal_level_items[item._name] = 1;
        })

        return assortTable;
    }
}

module.exports = { mod: new SampleTrader() }