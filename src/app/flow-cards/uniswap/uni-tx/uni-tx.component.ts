import { AfterViewInit, Component } from '@angular/core';
import { UniswapDto } from '../../../models/uniswap-dto';
import { Utils } from '../../../utils';
import { HttpService } from '../../../services/http.service';
import { NGXLogger } from 'ngx-logger';
import { Title } from '@angular/platform-browser';
import { UniswapSubscriberService } from '../uniswap-subscriber.service';
import { StaticValues } from 'src/app/static-values';
import { ViewTypeService } from '../../../services/view-type.service';
import { SnackService } from '../../../services/snack.service';
import { UniHistoryDialogComponent } from '../../../dialogs/uni-history-dialog/uni-history-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-uni-tx',
  templateUrl: './uni-tx.component.html',
  styleUrls: ['./uni-tx.component.css'],
})
export class UniTxComponent implements AfterViewInit {
  dtos: UniswapDto[] = [];
  dtosWhales: UniswapDto[] = [];
  txIds = new Set<string>();
  pureTitle = 'Harvest Live Dashboard';
  whalesMoreThan = 500;
  private maxMessages = 50;



  constructor(
    private txHistory: HttpService,
    private titleService: Title,
    private uniswapSubscriberService: UniswapSubscriberService,
    public vt: ViewTypeService,
    private snack: SnackService,
    private log: NGXLogger,
    private dialog: MatDialog
  ) { }

  ngAfterViewInit(): void {
    this.txHistory.getUniswapTxHistoryData().subscribe(
      (data) => {

        Utils.loadingOff();
        this.log.debug('tx data fetched', data?.length);
        data?.forEach((tx) => {
          UniswapDto.round(tx);
          this.saveLastValue(tx);
          // if (tx.amount < this.whalesMoreThan) {
          this.addInArray(this.dtos, tx);
          // } else {
          //   this.addInArray(this.dtosWhales, tx);
          // }
        });
      },
      (err) => {
        Utils.loadingOff();
      }
    );

    this.uniswapSubscriberService.handlers.set(this, (tx) => {


      if (tx.coin !== 'FARM') {
        return;
      }
      this.snack.openSnack(tx.print());
      if (!this.isUniqTx(tx)) {
        this.log.error('Not unique', tx);
        return;
      }
      if (tx.amount < this.whalesMoreThan) {
        this.addInArray(this.dtos, tx);
      } else {
        this.addInArray(this.dtosWhales, tx);
      }
      this.saveLastValue(tx);
    });
  }

  private isUniqTx(tx: UniswapDto): boolean {
    if (this.txIds.has(tx.id)) {
      return false;
    }
    this.txIds.add(tx.id);
    if (this.txIds.size > 100_000) {
      this.txIds = new Set<string>();
    }
    return true;
  }

  private addInArray(arr: UniswapDto[], tx: UniswapDto): void {
    if (tx.type === 'ADD' || tx.type === 'REM') {
      return;
    }
    arr.unshift(tx);
    if (arr.length > this.maxMessages) {
      arr.pop();
    }
  }



  private saveLastValue(tx: UniswapDto): void {
    if (!tx.confirmed || tx.lastPrice === 0) {
      return;
    }
    if (tx.lastPrice != null && tx.lastPrice !== 0) {
      this.titleService.setTitle(tx.lastPrice + ' | ' + this.pureTitle);
      StaticValues.lastPrice = tx.lastPrice;
    }
    if (tx.lastGas != null || tx.lastGas !== 0) {
      StaticValues.lastGas = tx.lastGas;
    }
    if (tx.blockDateAdopted != null) {
      StaticValues.lastBlockDateAdopted = tx.blockDateAdopted;
    }
    if (tx.ownerCount) {
      StaticValues.farmUsers = tx.ownerCount;
    }
  }

  openUniHistory(): void {
    this.dialog.open(UniHistoryDialogComponent, {
      width: '60%',
      data: {},
      panelClass: 'uni-tx-hist'
    });
  }


}
